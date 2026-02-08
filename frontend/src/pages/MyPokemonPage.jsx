import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Search } from "lucide-react";

export default function MyPokemonPage() {
  const [pokemon, setPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchMyPokemon();
  }, [token]);

  const fetchMyPokemon = async () => {
    try {
      const response = await axios.get(`${API}/pokemon/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPokemon(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei Pokemon");
    } finally {
      setLoading(false);
    }
  };

  const filteredPokemon = pokemon.filter(p => 
    p.pokemon_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPokemonSprite = (pokemonId) => {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 
            data-testid="my-pokemon-title"
            className="font-cinzel text-2xl sm:text-3xl text-[#2C3E50] mb-2"
          >
            I Miei Pokémon
          </h1>
          <p className="font-lato text-gray-600">
            I Pokémon che ti sono stati assegnati dall'Accademia
          </p>
        </div>

        {/* Search */}
        {pokemon.length > 0 && (
          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              data-testid="pokemon-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca Pokemon..."
              className="w-full pl-10 pr-4 py-3 border-2 border-[#D4AF37]/30 rounded-lg focus:border-[#D4AF37] outline-none font-lato"
            />
          </div>
        )}

        {/* Pokemon Grid */}
        {filteredPokemon.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredPokemon.map((p, index) => (
              <div
                key={p.id}
                data-testid={`pokemon-card-${index}`}
                onClick={() => navigate(`/pokemon/${p.pokemon_id}`)}
                className="bg-white gold-border p-4 rounded-lg cursor-pointer hover:shadow-lg transition-shadow animate-fade-in group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative">
                  <img
                    src={getPokemonSprite(p.pokemon_id)}
                    alt={p.pokemon_name}
                    className="w-full h-auto mx-auto group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      e.target.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
                    }}
                  />
                </div>
                <p className="font-cinzel text-center text-[#2C3E50] mt-2 capitalize text-sm">
                  {p.pokemon_name}
                </p>
                <p className="font-courier text-center text-gray-400 text-xs">
                  #{p.pokemon_id.toString().padStart(3, '0')}
                </p>
              </div>
            ))}
          </div>
        ) : pokemon.length === 0 ? (
          <div className="text-center py-16 bg-white gold-border rounded-lg">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png" 
                alt="Ditto"
                className="w-16 h-16 opacity-50"
              />
            </div>
            <h3 className="font-cinzel text-xl text-[#2C3E50] mb-2">
              Nessun Pokémon Assegnato
            </h3>
            <p className="font-lato text-gray-500 max-w-md mx-auto">
              L'Accademia non ti ha ancora assegnato nessun Pokémon. 
              Continua il tuo percorso da allenatore!
            </p>
          </div>
        ) : (
          <div className="text-center py-12 bg-white gold-border rounded-lg">
            <p className="font-lato text-gray-500">
              Nessun Pokémon trovato con "{searchTerm}"
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
