import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Calendar, Bell, Scroll } from "lucide-react";

export default function NewsDetailPage() {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const { newsId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchNews();
  }, [newsId, token]);

  const fetchNews = async () => {
    try {
      const response = await axios.get(`${API}/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(response.data);
    } catch (error) {
      toast.error("News non trovata");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getNewsIcon = (type) => {
    switch (type) {
      case "questionnaire": return <Scroll className="w-8 h-8" />;
      case "event": return <Calendar className="w-8 h-8" />;
      default: return <Bell className="w-8 h-8" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-pulse">
          <div className="pokeball mx-auto"></div>
          <p className="mt-4 font-cinzel text-[#2C3E50]">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!news) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-[#2C3E50] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            data-testid="back-to-dashboard-btn"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-lato">Torna alla Bacheca</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="bg-white gold-border shadow-lg p-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-start gap-6 mb-8">
            <div className={`
              w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0
              ${news.news_type === "questionnaire" 
                ? "bg-gradient-to-br from-[#8E44AD] to-[#6C3483] text-white" 
                : news.news_type === "event"
                ? "bg-gradient-to-br from-[#C0392B] to-[#922B21] text-white"
                : "bg-gradient-to-br from-[#2C3E50] to-[#1a252f] text-[#D4AF37]"}
            `}>
              {getNewsIcon(news.news_type)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`
                  text-xs px-3 py-1 rounded-full font-courier
                  ${news.news_type === "questionnaire" ? "bg-[#8E44AD] text-white" : 
                    news.news_type === "event" ? "bg-[#C0392B] text-white" : 
                    "bg-[#2C3E50] text-white"}
                `}>
                  {news.news_type === "questionnaire" ? "Questionario" : 
                   news.news_type === "event" ? "Evento" : "Annuncio"}
                </span>
                {news.size === "hero" && (
                  <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37] text-white font-courier">
                    In evidenza
                  </span>
                )}
              </div>
              
              <h1 
                data-testid="news-title"
                className="font-cinzel text-2xl sm:text-3xl text-[#2C3E50] mb-2"
              >
                {news.title}
              </h1>
              
              <p className="font-courier text-sm text-gray-400">
                Pubblicato il {new Date(news.created_at).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-[#D4AF37]/30 my-8"></div>

          {/* Content */}
          <div 
            data-testid="news-content"
            className="font-lato text-lg text-gray-700 leading-relaxed whitespace-pre-wrap"
          >
            {news.description}
          </div>

          {/* Action Button for Questionnaire */}
          {news.news_type === "questionnaire" && (
            <div className="mt-10 pt-8 border-t border-gray-200 text-center">
              <Button
                data-testid="start-questionnaire-btn"
                onClick={() => navigate("/questionnaire")}
                className="btn-academy"
              >
                Inizia il Questionario
              </Button>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
