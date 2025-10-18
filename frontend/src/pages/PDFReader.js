import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play,
  Pause,
  ArrowLeft,
  Languages,
  BookText,
  Brain,
  Lightbulb,
  Loader2,
} from "lucide-react";
import MindMapViewer from "../components/MindMapViewer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LANGUAGES = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ar", name: "العربية" },
];

const PDFReader = ({ user, onLogout }) => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [selectedText, setSelectedText] = useState("");
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [mindMap, setMindMap] = useState(null);
  const [generatingMindMap, setGeneratingMindMap] = useState(false);
  const [examples, setExamples] = useState("");
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);

  const utteranceRef = useRef(null);
  const wordsRef = useRef([]);
  const textContentRef = useRef(null);

  useEffect(() => {
    fetchDocument();
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}`);
      setDocument(response.data);
      // Split text into words for highlighting
      wordsRef.current = response.data.text_content.split(/\s+/);
    } catch (error) {
      toast.error("Error al cargar el documento");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = () => {
    if (isReading) {
      window.speechSynthesis.pause();
      setIsReading(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsReading(true);
      } else {
        startReading();
      }
    }
  };

  const startReading = () => {
    if (!document) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(document.text_content);
    utterance.lang = document.language || "en-US";
    utterance.rate = 1.0;

    let currentIndex = 0;

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setCurrentWordIndex(currentIndex);
        currentIndex++;
      }
    };

    utterance.onend = () => {
      setIsReading(false);
      setCurrentWordIndex(-1);
    };

    utterance.onerror = () => {
      setIsReading(false);
      toast.error("Error en la lectura de voz");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text) {
      setSelectedText(text);
      setTranslation("");
    }
  };

  const handleTranslate = async () => {
    if (!selectedText) {
      toast.error("Por favor selecciona un texto primero");
      return;
    }

    setTranslating(true);
    try {
      const response = await axios.post(`${API}/translate`, {
        text: selectedText,
        target_language: LANGUAGES.find((l) => l.code === targetLanguage)?.name || "Español",
      });
      setTranslation(response.data.translated_text);
    } catch (error) {
      toast.error("Error al traducir");
    } finally {
      setTranslating(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const response = await axios.post(`${API}/summarize`, {
        document_id: documentId,
      });
      setSummary(response.data.summary);
      toast.success("Resumen generado");
    } catch (error) {
      toast.error("Error al generar resumen");
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateMindMap = async () => {
    setGeneratingMindMap(true);
    try {
      const response = await axios.post(`${API}/mindmap`, {
        document_id: documentId,
      });
      setMindMap(response.data);
      setShowMindMap(true);
      toast.success("Mapa mental generado");
    } catch (error) {
      toast.error("Error al generar mapa mental");
    } finally {
      setGeneratingMindMap(false);
    }
  };

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const response = await axios.post(`${API}/examples`, {
        document_id: documentId,
      });
      setExamples(response.data.examples);
      toast.success("Ejemplos generados");
    } catch (error) {
      toast.error("Error al generar ejemplos");
    } finally {
      setGeneratingExamples(false);
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                data-testid="back-btn"
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-md">
                {document?.title}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                data-testid="read-aloud-btn"
                onClick={handleReadAloud}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isReading ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Leer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Document Text */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-white shadow-lg rounded-2xl">
              <div
                ref={textContentRef}
                data-testid="document-text"
                className="prose prose-lg max-w-none"
                onMouseUp={handleTextSelection}
              >
                {wordsRef.current.map((word, index) => (
                  <span
                    key={index}
                    className={`inline ${index === currentWordIndex ? "text-highlight active" : ""}`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar - Tools */}
          <div className="space-y-6">
            {/* Translation Tool */}
            <Card className="p-6 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <Languages className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Traducción</h3>
              </div>
              <div className="space-y-4">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger data-testid="language-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedText && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-600 mb-2">Texto seleccionado:</p>
                    <p className="text-gray-900 font-medium">{selectedText.substring(0, 100)}...</p>
                  </div>
                )}
                <Button
                  data-testid="translate-btn"
                  onClick={handleTranslate}
                  disabled={!selectedText || translating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {translating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traduciendo...
                    </>
                  ) : (
                    "Traducir Selección"
                  )}
                </Button>
                {translation && (
                  <div
                    data-testid="translation-result"
                    className="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                  >
                    <p className="text-indigo-900">{translation}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* AI Tools */}
            <Card className="p-6 bg-white shadow-lg rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Herramientas IA</h3>
              <div className="space-y-3">
                <Button
                  data-testid="summarize-btn"
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {summarizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <BookText className="w-4 h-4 mr-2" />
                      Resumir
                    </>
                  )}
                </Button>

                <Button
                  data-testid="mindmap-btn"
                  onClick={handleGenerateMindMap}
                  disabled={generatingMindMap}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generatingMindMap ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Mapa Mental
                    </>
                  )}
                </Button>

                <Button
                  data-testid="examples-btn"
                  onClick={handleGenerateExamples}
                  disabled={generatingExamples}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {generatingExamples ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Ejemplos
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Results Display */}
            {summary && (
              <Card className="p-6 bg-white shadow-lg rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Resumen</h3>
                <div
                  data-testid="summary-result"
                  className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {summary}
                </div>
              </Card>
            )}

            {examples && (
              <Card className="p-6 bg-white shadow-lg rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Ejemplos Personalizados</h3>
                <div
                  data-testid="examples-result"
                  className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {examples}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mind Map Modal */}
      {showMindMap && mindMap && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMindMap(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Mapa Mental</h2>
              <Button
                data-testid="close-mindmap-btn"
                onClick={() => setShowMindMap(false)}
                variant="ghost"
              >
                Cerrar
              </Button>
            </div>
            <div className="p-6">
              <MindMapViewer data={mindMap} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFReader;
