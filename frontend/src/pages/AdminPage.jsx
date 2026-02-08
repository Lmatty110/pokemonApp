import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  LogOut, 
  Shield,
  Scroll,
  Bell,
  Calendar
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("adminToken"));
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  const [newsForm, setNewsForm] = useState({
    title: "",
    description: "",
    news_type: "announcement",
    size: "normal"
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await axios.get(`${API}/admin/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(response.data);
      setIsLoggedIn(true);
    } catch (error) {
      localStorage.removeItem("adminToken");
      setToken(null);
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/admin/login`, loginForm);
      const newToken = response.data.access_token;
      localStorage.setItem("adminToken", newToken);
      setToken(newToken);
      setIsLoggedIn(true);
      toast.success("Accesso admin effettuato!");
      fetchNews(newToken);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setIsLoggedIn(false);
    setNews([]);
    toast.success("Logout effettuato");
  };

  const fetchNews = async (authToken = token) => {
    try {
      const response = await axios.get(`${API}/admin/news`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNews(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento delle news");
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingNews) {
        await axios.put(`${API}/admin/news/${editingNews.id}`, newsForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("News aggiornata con successo!");
      } else {
        await axios.post(`${API}/admin/news`, newsForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("News creata con successo!");
      }
      
      setNewsForm({ title: "", description: "", news_type: "announcement", size: "normal" });
      setEditingNews(null);
      fetchNews();
    } catch (error) {
      toast.error("Errore durante il salvataggio della news");
    } finally {
      setLoading(false);
    }
  };

  const handleEditNews = (newsItem) => {
    setEditingNews(newsItem);
    setNewsForm({
      title: newsItem.title,
      description: newsItem.description,
      news_type: newsItem.news_type,
      size: newsItem.size
    });
  };

  const handleDeleteClick = (newsItem) => {
    setNewsToDelete(newsItem);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!newsToDelete) return;
    
    try {
      await axios.delete(`${API}/admin/news/${newsToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("News eliminata con successo!");
      fetchNews();
    } catch (error) {
      toast.error("Errore durante l'eliminazione");
    } finally {
      setShowDeleteDialog(false);
      setNewsToDelete(null);
    }
  };

  const cancelEdit = () => {
    setEditingNews(null);
    setNewsForm({ title: "", description: "", news_type: "announcement", size: "normal" });
  };

  const getNewsIcon = (type) => {
    switch (type) {
      case "questionnaire": return <Scroll className="w-5 h-5" />;
      case "event": return <Calendar className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
        <header className="p-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#2C3E50] hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-lato">Torna alla Home</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-white gold-border shadow-lg p-8 animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2C3E50] flex items-center justify-center">
                  <Shield className="w-8 h-8 text-[#D4AF37]" />
                </div>
              </div>

              <h1 
                data-testid="admin-login-title"
                className="font-cinzel text-2xl text-[#2C3E50] text-center mb-2"
              >
                Accesso Admin
              </h1>
              <p className="font-lato text-sm text-gray-500 text-center mb-8">
                Pannello di gestione dell'Accademia
              </p>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-lato text-[#2C3E50]">
                    Email Admin
                  </Label>
                  <Input
                    data-testid="admin-email-input"
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="input-academy"
                    placeholder="admin@accademia.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-lato text-[#2C3E50]">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      data-testid="admin-password-input"
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="input-academy pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2C3E50]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  data-testid="admin-login-btn"
                  type="submit"
                  className="btn-academy w-full"
                  disabled={loading}
                >
                  {loading ? "Accesso..." : "Accedi come Admin"}
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-[#2C3E50] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#2C3E50]" />
            </div>
            <h1 className="font-cinzel text-xl text-white">Admin Panel</h1>
          </div>

          <Button
            data-testid="admin-logout-btn"
            variant="ghost"
            onClick={handleLogout}
            className="text-white hover:text-[#D4AF37] hover:bg-transparent"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Esci
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create/Edit News Form */}
          <div className="lg:col-span-1">
            <div className="bg-white gold-border p-6 rounded-sm shadow-md sticky top-8">
              <h2 className="font-cinzel text-xl text-[#2C3E50] mb-6 flex items-center gap-2">
                {editingNews ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingNews ? "Modifica News" : "Crea Nuova News"}
              </h2>

              <form onSubmit={handleCreateNews} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-lato text-[#2C3E50]">Titolo</Label>
                  <Input
                    data-testid="news-title-input"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    className="input-academy"
                    placeholder="Titolo della news"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-lato text-[#2C3E50]">Descrizione</Label>
                  <Textarea
                    data-testid="news-description-input"
                    value={newsForm.description}
                    onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })}
                    className="min-h-[100px] border-[#2C3E50]/20 focus:border-[#2C3E50]"
                    placeholder="Descrizione della news..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-lato text-[#2C3E50]">Tipo</Label>
                  <Select
                    value={newsForm.news_type}
                    onValueChange={(value) => setNewsForm({ ...newsForm, news_type: value })}
                  >
                    <SelectTrigger data-testid="news-type-select" className="border-[#2C3E50]/20">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Annuncio</SelectItem>
                      <SelectItem value="event">Evento</SelectItem>
                      <SelectItem value="questionnaire">Questionario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-lato text-[#2C3E50]">Dimensione</Label>
                  <Select
                    value={newsForm.size}
                    onValueChange={(value) => setNewsForm({ ...newsForm, size: value })}
                  >
                    <SelectTrigger data-testid="news-size-select" className="border-[#2C3E50]/20">
                      <SelectValue placeholder="Seleziona dimensione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="hero">Hero (In evidenza)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  {editingNews && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1 border-[#2C3E50]"
                    >
                      Annulla
                    </Button>
                  )}
                  <Button
                    data-testid="save-news-btn"
                    type="submit"
                    className="btn-academy flex-1"
                    disabled={loading}
                  >
                    {loading ? "Salvataggio..." : (editingNews ? "Aggiorna" : "Crea News")}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* News List */}
          <div className="lg:col-span-2">
            <h2 className="font-cinzel text-xl text-[#2C3E50] mb-6">
              News Esistenti ({news.length})
            </h2>

            <div className="space-y-4">
              {news.map((item, index) => (
                <div
                  key={item.id}
                  data-testid={`admin-news-item-${index}`}
                  className="bg-white border border-gray-200 rounded-sm p-4 hover:border-[#D4AF37] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${item.news_type === "questionnaire" ? "bg-[#8E44AD] text-white" : 
                          item.news_type === "event" ? "bg-[#C0392B] text-white" : 
                          "bg-[#2C3E50] text-[#D4AF37]"}
                      `}>
                        {getNewsIcon(item.news_type)}
                      </div>
                      <div>
                        <h3 className="font-cinzel text-lg text-[#2C3E50]">{item.title}</h3>
                        <p className="font-lato text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-courier text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleDateString("it-IT")}
                          </span>
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${item.size === "hero" ? "bg-[#D4AF37] text-white" : 
                              item.size === "large" ? "bg-[#2C3E50] text-white" : 
                              "bg-gray-200 text-gray-600"}
                          `}>
                            {item.size === "hero" ? "In evidenza" : item.size === "large" ? "Grande" : "Normale"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        data-testid={`edit-news-btn-${index}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNews(item)}
                        className="text-[#2C3E50] hover:text-[#D4AF37]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`delete-news-btn-${index}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {news.length === 0 && (
                <div className="text-center py-12 bg-white gold-border rounded-sm">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-lato text-gray-500">Nessuna news creata</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#FDFBF7] border-2 border-[#C0392B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-xl text-[#2C3E50]">
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription className="font-lato text-gray-600">
              Sei sicuro di voler eliminare la news "{newsToDelete?.title}"? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2C3E50]">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
