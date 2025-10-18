import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserPreferences = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setPreferences(response.data.preferences || "");
    } catch (error) {
      toast.error("Error al cargar preferencias");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/user/preferences`, {
        preferences: preferences,
      });
      toast.success("Preferencias guardadas exitosamente");
    } catch (error) {
      toast.error("Error al guardar preferencias");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              data-testid="back-btn"
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Preferencias de Usuario</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <Card className="p-8 bg-white shadow-lg rounded-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Personaliza tu experiencia de aprendizaje
            </h2>
            <p className="text-gray-600">
              Cuéntanos sobre tus intereses, nivel de conocimiento y áreas de estudio.
              Esto nos ayudará a generar ejemplos más relevantes y personalizados para ti.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="preferences"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tus intereses y contexto
              </label>
              <Textarea
                id="preferences"
                data-testid="preferences-textarea"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Ejemplo: Soy estudiante de medicina interesado en cardiología. Me gusta el fútbol y aprendo mejor con ejemplos prácticos del deporte. Tengo conocimientos básicos de biología celular..."
                className="min-h-[200px] text-base"
              />
              <p className="text-sm text-gray-500 mt-2">
                Incluye: área de estudio, nivel de conocimiento, intereses personales,
                estilo de aprendizaje preferido
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                ¿Cómo se usará esta información?
              </h3>
              <ul className="text-sm text-indigo-800 space-y-1">
                <li>• Generar ejemplos adaptados a tus intereses</li>
                <li>• Ajustar el nivel de complejidad de las explicaciones</li>
                <li>• Crear análogias relevantes a tu contexto</li>
                <li>• Mejorar la personalización del contenido generado por IA</li>
              </ul>
            </div>

            <Button
              data-testid="save-preferences-btn"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Preferencias
                </>
              )}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default UserPreferences;
