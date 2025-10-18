from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from PyPDF2 import PdfReader
import io
from langdetect import detect, DetectorFactory
from emergentintegrations.llm.chat import LlmChat, UserMessage
import requests

# For consistent language detection
DetectorFactory.seed = 0

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============ Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    preferences: Optional[str] = ""  # User interests and preferences
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    filename: str
    text_content: str
    language: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserPreferencesUpdate(BaseModel):
    preferences: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class SummarizeRequest(BaseModel):
    document_id: str


class MindMapRequest(BaseModel):
    document_id: str


class ExamplesRequest(BaseModel):
    document_id: str
    user_preferences: Optional[str] = ""


# ============ Auth Helper ============

async def get_current_user(authorization: Optional[str] = None, session_token: Optional[str] = None) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    
    if not token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one({
        "session_token": token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session:
        return None
    
    # Find user
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    # Convert ISO string to datetime if needed
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)


# ============ Auth Endpoints ============

@api_router.post("/auth/session-data")
async def process_session(x_session_id: str = Header(...), response: Response = None):
    """Process session ID from Emergent Auth and create user session"""
    try:
        # Call Emergent Auth to get user data
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session ID")
        
        user_data = auth_response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
        
        if not existing_user:
            # Create new user
            new_user = User(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data["name"],
                picture=user_data.get("picture"),
                preferences=""
            )
            user_dict = new_user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
            user_id = new_user.id
        else:
            user_id = existing_user["id"]
        
        # Create session
        session_token = user_data["session_token"]
        new_session = UserSession(
            user_id=user_id,
            session_token=session_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        session_dict = new_session.model_dump()
        session_dict['expires_at'] = session_dict['expires_at'].isoformat()
        session_dict['created_at'] = session_dict['created_at'].isoformat()
        await db.user_sessions.insert_one(session_dict)
        
        # Set cookie
        response = JSONResponse(content={"success": True, "session_token": session_token})
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Error processing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/auth/me")
async def get_me(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get current user info"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api_router.post("/auth/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    response: Response = None
):
    """Logout user"""
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response = JSONResponse(content={"success": True})
    response.delete_cookie(key="session_token", path="/")
    return response


# ============ Document Endpoints ============

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload PDF document and extract text"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read PDF
        pdf_bytes = await file.read()
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        # Extract text from all pages
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Detect language
        try:
            language = detect(text_content[:1000])  # Use first 1000 chars for detection
        except:
            language = "unknown"
        
        # Create document
        document = Document(
            user_id=user.id,
            title=file.filename.replace('.pdf', ''),
            filename=file.filename,
            text_content=text_content,
            language=language
        )
        
        doc_dict = document.model_dump()
        doc_dict['uploaded_at'] = doc_dict['uploaded_at'].isoformat()
        await db.documents.insert_one(doc_dict)
        
        return document
    
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/documents", response_model=List[Document])
async def get_documents(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all documents for current user"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    documents = await db.documents.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(1000)
    
    # Convert ISO strings to datetime
    for doc in documents:
        if isinstance(doc.get('uploaded_at'), str):
            doc['uploaded_at'] = datetime.fromisoformat(doc['uploaded_at'])
    
    return documents


@api_router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get specific document"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    document = await db.documents.find_one(
        {"id": document_id, "user_id": user.id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Convert ISO string to datetime
    if isinstance(document.get('uploaded_at'), str):
        document['uploaded_at'] = datetime.fromisoformat(document['uploaded_at'])
    
    return Document(**document)


# ============ AI Processing Endpoints ============

@api_router.post("/translate")
async def translate_text(
    request: TranslateRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Translate text to target language using Gemini"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{user.id}_{uuid.uuid4()}",
            system_message=f"You are a professional translator. Translate the given text to {request.target_language}. Only provide the translation, nothing else."
        ).with_model("gemini", "gemini-2.5-pro")
        
        message = UserMessage(text=request.text)
        translation = await chat.send_message(message)
        
        return {"translated_text": translation}
    
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/summarize")
async def summarize_document(
    request: SummarizeRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Generate summary of document using Gemini"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get document
    document = await db.documents.find_one(
        {"id": request.document_id, "user_id": user.id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"summarize_{user.id}_{uuid.uuid4()}",
            system_message="You are an expert at creating concise, accurate summaries while maintaining conceptual precision. Create a clear summary of the given text."
        ).with_model("gemini", "gemini-2.5-pro")
        
        message = UserMessage(text=f"Summarize this document:\n\n{document['text_content'][:15000]}")
        summary = await chat.send_message(message)
        
        return {"summary": summary}
    
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/mindmap")
async def generate_mindmap(
    request: MindMapRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Generate mind map structure of document using Gemini"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get document
    document = await db.documents.find_one(
        {"id": request.document_id, "user_id": user.id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"mindmap_{user.id}_{uuid.uuid4()}",
            system_message="""You are an expert at creating mind maps. Generate a JSON structure representing a mind map with nodes and links.
Return ONLY valid JSON in this format:
{
  "nodes": [{"id": "1", "name": "Main Topic", "level": 0}, {"id": "2", "name": "Subtopic", "level": 1}],
  "links": [{"source": "1", "target": "2"}]
}
Do not include any markdown formatting or explanation, just the JSON."""
        ).with_model("gemini", "gemini-2.5-pro")
        
        message = UserMessage(
            text=f"Create a mind map structure from this document. Include main concepts and their relationships:\n\n{document['text_content'][:10000]}"
        )
        mindmap_json = await chat.send_message(message)
        
        # Try to parse JSON
        import json
        try:
            # Clean response - remove markdown code blocks if present
            clean_json = mindmap_json.strip()
            if clean_json.startswith('```'):
                clean_json = clean_json.split('```json')[1].split('```')[0].strip()
            elif clean_json.startswith('```'):
                clean_json = clean_json.split('```')[1].split('```')[0].strip()
            
            mindmap_data = json.loads(clean_json)
            return mindmap_data
        except:
            # If parsing fails, return a simple structure
            return {
                "nodes": [{"id": "1", "name": document['title'], "level": 0}],
                "links": [],
                "raw_response": mindmap_json
            }
    
    except Exception as e:
        logger.error(f"Mind map generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/examples")
async def generate_examples(
    request: ExamplesRequest,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Generate personalized examples based on document content and user preferences using Gemini"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get document
    document = await db.documents.find_one(
        {"id": request.document_id, "user_id": user.id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get user preferences
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
    preferences = user_doc.get('preferences', '') or request.user_preferences
    
    try:
        system_message = "You are an expert educator who creates simple, relatable examples to explain complex concepts."
        if preferences:
            system_message += f" The learner's interests and background: {preferences}. Tailor examples to their context."
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"examples_{user.id}_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-pro")
        
        message = UserMessage(
            text=f"Based on this document content, generate 3-5 simple, personalized examples that help understand the main concepts:\n\n{document['text_content'][:10000]}"
        )
        examples = await chat.send_message(message)
        
        return {"examples": examples}
    
    except Exception as e:
        logger.error(f"Examples generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ User Preferences ============

@api_router.put("/user/preferences")
async def update_preferences(
    request: UserPreferencesUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update user preferences"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"preferences": request.preferences}}
    )
    
    return {"success": True}


@api_router.get("/user/preferences")
async def get_preferences(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user preferences"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
    return {"preferences": user_doc.get('preferences', '')}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
