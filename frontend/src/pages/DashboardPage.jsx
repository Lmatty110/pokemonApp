import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { LogOut, Scroll, Bell, ChevronRight, User } from "lucide-react";

export default function DashboardPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  useEffect(() => {
    fetchNews();
  }, [token]);

  const fetchNews = async () => {
    try {
      const response = await axios.get(`${API}/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento delle news");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Arrivederci, allenatore!");
    navigate("/");
  };

  const handleNewsClick = (newsItem) => {
    if (newsItem.news_type === "questionnaire") {
      navigate("/questionnaire");
    } else {
      toast.info("Questa sezione sarà disponibile presto!");
    }
  };

  const getNewsIcon = (type) => {
    switch (type) {
      case "questionnaire":
        return <Scroll className="w-8 h-8" />;
      case "announcement":
        return <Bell className="w-8 h-8" />;
      default:
        return <Bell className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-[#2C3E50] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="pokeball scale-50"></div>
            <h1 className="font-cinzel text-xl text-white">Accademia Pokémon</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-lato text-sm hidden sm:inline">{user?.username}</span>
            </div>
            <Button
              data-testid="logout-btn"
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:text-[#D4AF37] hover:bg-transparent"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-2 hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-12 animate-fade-in">
          <h2 
            data-testid="welcome-title"
            className="font-cinzel text-2xl sm:text-3xl text-[#2C3E50] mb-2"
          >
            Benvenuto, {user?.username}
          </h2>
          <p className="font-lato text-gray-600">
            Consulta le ultime novità dall'Accademia
          </p>
        </div>

        {/* News Grid - Bento Style */}
        <section>
          <h3 className="font-cinzel text-xl text-[#2C3E50] mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D4AF37]" />
            Bacheca Notizie
          </h3>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse">
                <div className="pokeball mx-auto"></div>
                <p className="mt-4 font-lato text-gray-500">Caricamento...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <div
                  key={item.id}
                  data-testid={`news-card-${index}`}
                  onClick={() => handleNewsClick(item)}
                  className={`
                    news-card cursor-pointer p-6 rounded-sm
                    ${item.size === "hero" ? "md:col-span-2 lg:col-span-2" : ""}
                    animate-fade-in
                  `}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center
                      ${item.news_type === "questionnaire" 
                        ? "bg-[#8E44AD] text-white" 
                        : "bg-[#2C3E50] text-[#D4AF37]"}
                    `}>
                      {getNewsIcon(item.news_type)}
                    </div>
                    {item.size === "hero" && (
                      <span className="font-courier text-xs text-white bg-[#C0392B] px-3 py-1 rounded-full">
                        NUOVO
                      </span>
                    )}
                  </div>

                  <h4 className="font-cinzel text-xl text-[#2C3E50] mb-2">
                    {item.title}
                  </h4>
                  <p className="font-lato text-gray-600 mb-4 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-courier text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString("it-IT")}
                    </span>
                    <span className="flex items-center gap-1 text-[#C0392B] font-lato text-sm group-hover:text-[#D4AF37]">
                      Apri <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && news.length === 0 && (
            <div className="text-center py-12 bg-white gold-border rounded-sm">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="font-lato text-gray-500">Nessuna news disponibile</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#2C3E50] mt-auto py-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-courier text-xs text-gray-400">
            © 2024 Accademia Pokémon - Area Riservata
          </p>
        </div>
      </footer>
    </div>
  );
}
