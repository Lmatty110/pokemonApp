import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { BookOpen, Award, Users, Scroll } from "lucide-react";
import PokedexIcon from "../components/PokedexIcon";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleEnter = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-bg min-h-screen relative">
        <div className="hero-overlay absolute inset-0"></div>
        
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          {/* Academy Crest */}
          <div className="mb-8 animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#D4AF37] bg-[#2C3E50] flex items-center justify-center shadow-lg">
              <BookOpen className="w-12 h-12 text-[#D4AF37]" />
            </div>
          </div>

          {/* Title */}
          <h1 
            data-testid="hero-title"
            className="font-cinzel text-4xl sm:text-5xl lg:text-6xl text-white text-center mb-4 tracking-wide animate-fade-in"
          >
            Accademia Pokémon
          </h1>
          
          <p className="font-lato text-base sm:text-lg text-[#D4AF37] text-center mb-2 animate-fade-in stagger-1">
            Istituto di Formazione per Allenatori
          </p>
          
          <p className="font-lato text-sm text-gray-300 text-center max-w-xl mb-12 animate-fade-in stagger-2">
            Scopri il tuo potenziale come allenatore attraverso la valutazione ufficiale della Commissione
          </p>

          {/* CTA Button */}
          <Button
            data-testid="enter-academy-btn"
            onClick={handleEnter}
            className="btn-academy text-lg px-12 py-6 animate-fade-in stagger-3"
          >
            Entra nell'Accademia
          </Button>

          <button
            type="button"
            onClick={() => navigate("/pokedex")}
            data-testid="homepage-pokedex-link"
            className="group absolute bottom-5 right-4 flex items-center gap-3 rounded-2xl border border-white/30 bg-[#B82030]/90 p-3 pr-4 text-left text-white shadow-xl backdrop-blur-sm transition hover:-translate-y-1 hover:bg-[#C92B3B] sm:bottom-8 sm:right-8"
            aria-label="Apri il Pokédex"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#A9F8FF]">
              <PokedexIcon className="h-8 w-8 text-[#C72636]" />
            </span>
            <span className="hidden sm:block">
              <span className="block font-courier text-[9px] uppercase tracking-widest text-white/65">Archivio</span>
              <span className="block font-cinzel text-sm">Pokédex</span>
            </span>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#FDFBF7] py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-cinzel text-2xl sm:text-3xl text-[#2C3E50] text-center mb-16">
            Il Percorso dell'Allenatore
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div 
              data-testid="feature-card-1"
              className="bg-white p-8 gold-border shadow-md animate-fade-in stagger-1"
            >
              <div className="w-16 h-16 rounded-full bg-[#2C3E50] flex items-center justify-center mb-6">
                <Scroll className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-cinzel text-xl text-[#2C3E50] mb-4">Questionario Ufficiale</h3>
              <p className="font-lato text-gray-600">
                Rispondi alle domande della Commissione per scoprire la tua vera natura di allenatore.
              </p>
            </div>

            {/* Feature 2 */}
            <div 
              data-testid="feature-card-2"
              className="bg-white p-8 gold-border shadow-md animate-fade-in stagger-2"
            >
              <div className="w-16 h-16 rounded-full bg-[#2C3E50] flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-cinzel text-xl text-[#2C3E50] mb-4">Valutazione Personale</h3>
              <p className="font-lato text-gray-600">
                Ricevi la tua classificazione ufficiale basata sul tuo profilo di personalità.
              </p>
            </div>

            {/* Feature 3 */}
            <div 
              data-testid="feature-card-3"
              className="bg-white p-8 gold-border shadow-md animate-fade-in stagger-3"
            >
              <div className="w-16 h-16 rounded-full bg-[#2C3E50] flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-cinzel text-xl text-[#2C3E50] mb-4">Community</h3>
              <p className="font-lato text-gray-600">
                Unisciti alla community di allenatori e confronta i tuoi risultati.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2C3E50] py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="pokeball scale-75"></div>
          </div>
          <p className="font-courier text-sm text-gray-400">
            © 2024 Accademia Pokémon - Tutti i diritti riservati
          </p>
        </div>
      </footer>
    </div>
  );
}
