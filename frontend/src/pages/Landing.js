import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Globe, Brain, Lightbulb, Volume2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Landing = ({ onAuthSuccess }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session_id in the URL fragment
    const hash = window.location.hash;
    if (hash && hash.includes("session_id=")) {
      const sessionId = hash.split("session_id=")[1].split("&")[0];
      processSessionId(sessionId);
    }
  }, []);

  const processSessionId = async (sessionId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/session-data`, {
        method: "POST",
        headers: {
          "X-Session-ID": sessionId,
        },
        credentials: "include",
      });

      if (response.ok) {
        // Clear the hash
        window.location.hash = "";
        // Trigger auth check
        await onAuthSuccess();
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error processing session:", error);
    }
  };

  const handleLogin = () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(
      redirectUrl
    )}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">StudyAssist</span>
        </div>
        <Button
          data-testid="header-login-btn"
          onClick={handleLogin}
          variant="outline"
          className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
        >
          Iniciar Sesión
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Tu Asistente de Lectura
          <br />
          <span className="text-indigo-600">Inteligente y Multilingüe</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
          Transforma tu forma de estudiar con IA. Lee, traduce, resume y comprende
          documentos PDF en cualquier idioma con herramientas interactivas personalizadas.
        </p>
        <Button
          data-testid="hero-get-started-btn"
          onClick={handleLogin}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          Comenzar Gratis
        </Button>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div
            data-testid="feature-tts"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <Volume2 className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Lectura en Voz Alta
            </h3>
            <p className="text-gray-600">
              Escucha tus documentos con resaltado sincronizado palabra por palabra.
              Compatible con cualquier idioma.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            data-testid="feature-translate"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Traducción Instantánea
            </h3>
            <p className="text-gray-600">
              Traduce palabras o secciones completas al instante. Diccionario
              contextual en más de 100 idiomas.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            data-testid="feature-mindmap"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Brain className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Mapas Mentales IA
            </h3>
            <p className="text-gray-600">
              Visualiza conceptos clave y sus relaciones. Genera mapas mentales
              interactivos automáticamente.
            </p>
          </div>

          {/* Feature 4 */}
          <div
            data-testid="feature-summary"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Resúmenes Precisos
            </h3>
            <p className="text-gray-600">
              Obtén resúmenes concisos que mantienen la precisión conceptual del
              texto original.
            </p>
          </div>

          {/* Feature 5 */}
          <div
            data-testid="feature-examples"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <Lightbulb className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Ejemplos Personalizados
            </h3>
            <p className="text-gray-600">
              Recibe ejemplos adaptados a tus intereses y nivel de conocimiento para
              mejor comprensión.
            </p>
          </div>

          {/* Feature 6 */}
          <div
            data-testid="feature-multilang"
            className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-pink-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Multi-idioma
            </h3>
            <p className="text-gray-600">
              Detección automática de idioma y soporte para documentos en cualquier
              lengua sin configuración.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿Listo para estudiar de forma más inteligente?
          </h2>
          <p className="text-base sm:text-lg mb-8 opacity-90">
            Únete hoy y transforma tu experiencia de aprendizaje
          </p>
          <Button
            data-testid="cta-get-started-btn"
            onClick={handleLogin}
            size="lg"
            className="bg-white text-indigo-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg"
          >
            Comenzar Ahora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-gray-600">
        <p>© 2025 StudyAssist. Potenciado por IA Gemini 2.5 Pro.</p>
      </footer>
    </div>
  );
};

export default Landing;
