import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import axios from "axios";
import { LogOut, Scroll, Bell, ChevronRight, User, Sparkles, Clock, Star } from "lucide-react";

export default function DashboardPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizHistory, setQuizHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  useEffect(() => {
    fetchNews();
    fetchQuizHistory();
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

  const fetchQuizHistory = async () => {
    try {
      const response = await axios.get(`${API}/quiz/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizHistory(response.data);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    }
  };

  // Check if user has completed the questionnaire
  const hasCompletedQuiz = quizHistory.length > 0;

  const handleLogout = () => {
    logout();
    toast.success("Arrivederci, allenatore!");
    navigate("/");
  };

  const handleNewsClick = (newsItem) => {
    if (newsItem.news_type === "questionnaire") {
      setShowConfirmDialog(true);
    } else {
      toast.info("Questa sezione sarà disponibile presto!");
    }
  };

  const handleConfirmQuestionnaire = () => {
    setShowConfirmDialog(false);
    navigate("/questionnaire");
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
              {news.map((item, index) => {
                const isQuestionnaire = item.news_type === "questionnaire";
                const showNewBadge = item.size === "hero" && !(isQuestionnaire && hasCompletedQuiz);
                
                return (
                  <div
                    key={item.id}
                    data-testid={`news-card-${index}`}
                    onClick={() => handleNewsClick(item)}
                    className={`
                      news-card-enhanced cursor-pointer rounded-lg overflow-hidden
                      ${item.size === "hero" ? "md:col-span-2 lg:col-span-2" : ""}
                      animate-fade-in
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Gradient Header */}
                    <div className={`
                      h-2 w-full
                      ${isQuestionnaire 
                        ? "bg-gradient-to-r from-[#8E44AD] via-[#C0392B] to-[#D4AF37]" 
                        : "bg-gradient-to-r from-[#2C3E50] to-[#D4AF37]"}
                    `}></div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`
                          w-14 h-14 rounded-xl flex items-center justify-center shadow-md
                          ${isQuestionnaire 
                            ? "bg-gradient-to-br from-[#8E44AD] to-[#6C3483] text-white" 
                            : "bg-gradient-to-br from-[#2C3E50] to-[#1a252f] text-[#D4AF37]"}
                        `}>
                          {getNewsIcon(item.news_type)}
                        </div>
                        <div className="flex items-center gap-2">
                          {isQuestionnaire && hasCompletedQuiz && (
                            <span className="font-courier text-xs text-white bg-green-500 px-3 py-1 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" /> COMPLETATO
                            </span>
                          )}
                          {showNewBadge && (
                            <span className="font-courier text-xs text-white bg-[#C0392B] px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3" /> NUOVO
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="font-cinzel text-xl text-[#2C3E50] mb-3">
                        {item.title}
                      </h4>
                      <p className="font-lato text-gray-600 mb-5 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="font-courier text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString("it-IT")}
                        </span>
                        <span className="flex items-center gap-1 text-[#8E44AD] font-lato text-sm font-medium hover:text-[#C0392B] transition-colors">
                          {isQuestionnaire && hasCompletedQuiz ? "Ripeti" : "Apri"} 
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[#FDFBF7] border-2 border-[#D4AF37]">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#8E44AD] flex items-center justify-center">
                <Scroll className="w-8 h-8 text-white" />
              </div>
            </div>
            <AlertDialogTitle className="font-cinzel text-xl text-[#2C3E50] text-center">
              Iniziare il Questionario?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-lato text-center text-gray-600">
              Stai per iniziare la valutazione ufficiale della Commissione dell'Accademia. 
              Il questionario comprende 10 domande sulla tua personalità come allenatore.
              {hasCompletedQuiz && (
                <span className="block mt-2 text-[#8E44AD] font-medium">
                  Hai già completato questo questionario. Vuoi ripeterlo?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 justify-center">
            <AlertDialogCancel 
              data-testid="cancel-questionnaire-btn"
              className="border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              data-testid="confirm-questionnaire-btn"
              onClick={handleConfirmQuestionnaire}
              className="btn-academy"
            >
              Inizia Questionario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
