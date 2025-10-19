import requests
import sys
import json
import io
from datetime import datetime
import time

class StudyAssistAPITester:
    def __init__(self, base_url="https://studyassist-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1760876722094"  # Use provided test session
        self.user_id = "test-user-1760876722094"  # Use provided test user
        self.tests_run = 0
        self.tests_passed = 0
        self.document_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        # Use session token as cookie instead of Bearer token
        cookies = {}
        if self.session_token:
            cookies['session_token'] = self.session_token

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    if 'Content-Type' in test_headers:
                        del test_headers['Content-Type']
                    response = requests.post(url, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_user_and_session(self):
        """Create test user and session directly in MongoDB"""
        print("\n🔧 Creating test user and session...")
        
        import subprocess
        timestamp = int(time.time())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongo_script = f'''
use('test_database');
var userId = '{user_id}';
var sessionToken = '{session_token}';
db.users.insertOne({{
  id: userId,
  email: 'test.user.{timestamp}@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  preferences: 'I am a test user interested in technology and learning',
  created_at: new Date().toISOString()
}});
db.user_sessions.insertOne({{
  id: 'session-{timestamp}',
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
}});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
'''
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_script], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                print(f"✅ Test user created - ID: {user_id}")
                print(f"✅ Session token: {session_token}")
                return True
            else:
                print(f"❌ Failed to create test user: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error creating test user: {str(e)}")
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_upload_document(self):
        """Test PDF document upload"""
        # Create a simple test PDF content (mock)
        test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test document content) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF"
        
        files = {'file': ('test_document.pdf', io.BytesIO(test_pdf_content), 'application/pdf')}
        
        success, response = self.run_test(
            "Upload PDF Document",
            "POST",
            "documents/upload",
            200,
            files=files
        )
        
        if success and 'id' in response:
            self.document_id = response['id']
            print(f"   Document ID: {self.document_id}")
        
        return success

    def test_get_documents(self):
        """Test getting user documents"""
        success, response = self.run_test(
            "Get User Documents",
            "GET",
            "documents",
            200
        )
        return success

    def test_get_document_by_id(self):
        """Test getting specific document"""
        if not self.document_id:
            print("❌ Skipping - No document ID available")
            return False
            
        success, response = self.run_test(
            "Get Document by ID",
            "GET",
            f"documents/{self.document_id}",
            200
        )
        return success

    def test_translate_text(self):
        """Test text translation"""
        success, response = self.run_test(
            "Translate Text",
            "POST",
            "translate",
            200,
            data={
                "text": "Hello world, this is a test",
                "target_language": "Español"
            }
        )
        return success

    def test_summarize_document(self):
        """Test document summarization"""
        if not self.document_id:
            print("❌ Skipping - No document ID available")
            return False
            
        success, response = self.run_test(
            "Summarize Document",
            "POST",
            "summarize",
            200,
            data={"document_id": self.document_id}
        )
        return success

    def test_generate_mindmap(self):
        """Test mind map generation"""
        if not self.document_id:
            print("❌ Skipping - No document ID available")
            return False
            
        success, response = self.run_test(
            "Generate Mind Map",
            "POST",
            "mindmap",
            200,
            data={"document_id": self.document_id}
        )
        return success

    def test_generate_examples(self):
        """Test personalized examples generation"""
        if not self.document_id:
            print("❌ Skipping - No document ID available")
            return False
            
        success, response = self.run_test(
            "Generate Examples",
            "POST",
            "examples",
            200,
            data={
                "document_id": self.document_id,
                "user_preferences": "I like technology and programming examples"
            }
        )
        return success

    def test_user_preferences(self):
        """Test user preferences endpoints"""
        # Test getting preferences
        success1, response = self.run_test(
            "Get User Preferences",
            "GET",
            "user/preferences",
            200
        )
        
        # Test updating preferences
        success2, response = self.run_test(
            "Update User Preferences",
            "PUT",
            "user/preferences",
            200,
            data={"preferences": "Updated test preferences for learning"}
        )
        
        return success1 and success2

    def test_logout(self):
        """Test user logout"""
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting StudyAssist API Testing...")
    print("=" * 60)
    
    tester = StudyAssistAPITester()
    
    # Use existing test user and session
    print(f"🔧 Using existing test session: {tester.session_token}")
    print(f"🔧 Using existing test user: {tester.user_id}")
    
    # Run authentication tests
    print("\n📋 Testing Authentication...")
    tester.test_auth_me()
    
    # Run document tests
    print("\n📄 Testing Document Management...")
    tester.test_upload_document()
    tester.test_get_documents()
    tester.test_get_document_by_id()
    
    # Run AI processing tests
    print("\n🤖 Testing AI Features...")
    tester.test_translate_text()
    
    # Wait a bit for AI processing (these can be slow)
    print("\n⏳ Testing AI document processing (may take longer)...")
    time.sleep(2)
    tester.test_summarize_document()
    time.sleep(2)
    tester.test_generate_mindmap()
    time.sleep(2)
    tester.test_generate_examples()
    
    # Test user preferences
    print("\n⚙️ Testing User Preferences...")
    tester.test_user_preferences()
    
    # Test logout
    print("\n🚪 Testing Logout...")
    tester.test_logout()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API testing completed successfully!")
        return 0
    else:
        print("⚠️ Some backend tests failed. Check the logs above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())