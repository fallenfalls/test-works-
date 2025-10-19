import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  BookOpen,
  Upload,
  Settings,
  LogOut,
  FileText,
  Clock,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Tamaño máximo: 10MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Documento cargado exitosamente");
      // Reset file input
      event.target.value = "";
      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error.response?.data?.detail || "Error al cargar el documento";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">StudyAssist</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img
                src={user?.picture || "https://via.placeholder.com/40"}
                alt={user?.name}
                className="w-10 h-10 rounded-full border-2 border-indigo-200"
              />
              <span className="text-gray-700 font-medium hidden sm:inline">
                {user?.name}
              </span>
            </div>
            <Button
              data-testid="preferences-btn"
              onClick={() => navigate("/preferences")}
              variant="outline"
              size="icon"
              className="border-gray-300 hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              data-testid="logout-btn"
              onClick={onLogout}
              variant="outline"
              size="icon"
              className="border-gray-300 hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Upload Section */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Mis Documentos
          </h1>
          <p className="text-gray-600 mb-8">
            Carga un PDF para comenzar a estudiar con herramientas de IA
          </p>
          <label htmlFor="file-upload">
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="file-upload-input"
            />
            <Button
              data-testid="upload-btn"
              disabled={uploading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg cursor-pointer"
              onClick={() => document.getElementById("file-upload").click()}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Cargar Documento PDF
                </>
              )}
            </Button>
          </label>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div
            data-testid="empty-state"
            className="text-center py-20 bg-white rounded-2xl shadow-md"
          >
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay documentos todavía
            </h3>
            <p className="text-gray-500">
              Carga tu primer PDF para comenzar
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                data-testid={`document-card-${doc.id}`}
                onClick={() => navigate(`/reader/${doc.id}`)}
                className="p-6 hover:shadow-xl transition-shadow cursor-pointer bg-white border border-gray-200 rounded-xl"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">
                      {doc.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                      {doc.language !== "unknown" && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {doc.language.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
