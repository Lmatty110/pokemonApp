import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      login(response.data.access_token, response.data.user);
      toast.success(isLogin ? "Benvenuto nell'Accademia!" : "Registrazione completata!");
      navigate("/dashboard");
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Errore durante l'autenticazione";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Header */}
      <header className="p-4">
        <button
          data-testid="back-to-home-btn"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#2C3E50] hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-lato">Torna alla Home</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white gold-border shadow-lg p-8 animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="pokeball"></div>
            </div>

            {/* Title */}
            <h1 
              data-testid="auth-title"
              className="font-cinzel text-2xl text-[#2C3E50] text-center mb-2"
            >
              {isLogin ? "Accesso Allenatore" : "Registrazione"}
            </h1>
            <p className="font-lato text-sm text-gray-500 text-center mb-8">
              {isLogin 
                ? "Inserisci le tue credenziali per accedere" 
                : "Crea il tuo account per iniziare il percorso"}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="username" className="font-lato text-[#2C3E50]">
                    Nome Allenatore
                  </Label>
                  <Input
                    data-testid="username-input"
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className="input-academy"
                    placeholder="Il tuo nome da allenatore"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-lato text-[#2C3E50]">
                  Email
                </Label>
                <Input
                  data-testid="email-input"
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-academy"
                  placeholder="la-tua-email@esempio.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-lato text-[#2C3E50]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    data-testid="password-input"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
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
                data-testid="submit-auth-btn"
                type="submit"
                className="btn-academy w-full"
                disabled={loading}
              >
                {loading ? "Caricamento..." : (isLogin ? "Accedi" : "Registrati")}
              </Button>
            </form>

            {/* Toggle */}
            <div className="mt-8 text-center">
              <p className="font-lato text-sm text-gray-500">
                {isLogin ? "Non hai un account?" : "Hai già un account?"}
              </p>
              <button
                data-testid="toggle-auth-btn"
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-cinzel text-[#C0392B] hover:text-[#D4AF37] transition-colors mt-1"
              >
                {isLogin ? "Registrati" : "Accedi"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
