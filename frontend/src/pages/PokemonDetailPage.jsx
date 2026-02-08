import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Zap, Shield, Swords, Heart, Wind, Target } from "lucide-react";
import { Progress } from "../components/ui/progress";

export default function PokemonDetailPage() {
  const [pokemon, setPokemon] = useState(null);
  const [species, setSpecies] = useState(null);
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");
  const { pokemonId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchPokemonData();
  }, [pokemonId]);

  const fetchPokemonData = async () => {
    try {
      // Fetch Pokemon data from PokeAPI
      const pokemonRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      setPokemon(pokemonRes.data);

      // Fetch species for Italian name
      const speciesRes = await axios.get(pokemonRes.data.species.url);
      setSpecies(speciesRes.data);

      // Filter moves available in Scarlet/Violet (generation 9)
      const svMoves = pokemonRes.data.moves.filter(move => 
        move.version_group_details.some(vgd => 
          vgd.version_group.name === "scarlet-violet"
        )
      ).slice(0, 30); // Limit to 30 moves

      // Fetch move details
      const moveDetails = await Promise.all(
        svMoves.map(async (move) => {
          try {
            const moveRes = await axios.get(move.move.url);
            const italianName = moveRes.data.names.find(n => n.language.name === "it")?.name || moveRes.data.name;
            return {
              name: italianName,
              englishName: moveRes.data.name,
              type: moveRes.data.type.name,
              power: moveRes.data.power,
              accuracy: moveRes.data.accuracy,
              pp: moveRes.data.pp,
              damageClass: moveRes.data.damage_class.name
            };
          } catch {
            return null;
          }
        })
      );

      setMoves(moveDetails.filter(m => m !== null));
    } catch (error) {
      toast.error("Errore nel caricamento del Pokemon");
      navigate("/my-pokemon");
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
      grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
      ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
      rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
      steel: "#B8B8D0", fairy: "#EE99AC"
    };
    return colors[type] || "#68A090";
  };

  const getStatIcon = (stat) => {
    switch (stat) {
      case "hp": return <Heart className="w-4 h-4" />;
      case "attack": return <Swords className="w-4 h-4" />;
      case "defense": return <Shield className="w-4 h-4" />;
      case "special-attack": return <Zap className="w-4 h-4" />;
      case "special-defense": return <Target className="w-4 h-4" />;
      case "speed": return <Wind className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatName = (stat) => {
    const names = {
      "hp": "PS",
      "attack": "Attacco",
      "defense": "Difesa",
      "special-attack": "Att. Speciale",
      "special-defense": "Dif. Speciale",
      "speed": "Velocità"
    };
    return names[stat] || stat;
  };

  const getItalianName = () => {
    if (!species) return pokemon?.name;
    const italianName = species.names.find(n => n.language.name === "it");
    return italianName?.name || pokemon?.name;
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

  if (!pokemon) return null;

  const mainType = pokemon.types[0].type.name;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header with gradient based on Pokemon type */}
      <header 
        className="shadow-lg"
        style={{ background: `linear-gradient(135deg, ${getTypeColor(mainType)}, ${getTypeColor(pokemon.types[1]?.type.name || mainType)})` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            data-testid="back-to-pokemon-btn"
            onClick={() => navigate("/my-pokemon")}
            className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-lato">I Miei Pokémon</span>
          </button>
        </div>
      </header>

      {/* Pokemon Header */}
      <div 
        className="relative pb-8"
        style={{ background: `linear-gradient(180deg, ${getTypeColor(mainType)}40, transparent)` }}
      >
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Pokemon Image */}
            <div className="relative">
              <div 
                className="w-48 h-48 rounded-full flex items-center justify-center"
                style={{ background: `${getTypeColor(mainType)}30` }}
              >
                <img
                  src={pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default}
                  alt={getItalianName()}
                  className="w-40 h-40 object-contain"
                />
              </div>
            </div>

            {/* Pokemon Info */}
            <div className="text-center sm:text-left">
              <p className="font-courier text-gray-500 mb-1">
                #{pokemon.id.toString().padStart(3, '0')}
              </p>
              <h1 
                data-testid="pokemon-name"
                className="font-cinzel text-3xl sm:text-4xl text-[#2C3E50] capitalize mb-3"
              >
                {getItalianName()}
              </h1>
              
              {/* Types */}
              <div className="flex gap-2 justify-center sm:justify-start">
                {pokemon.types.map((t) => (
                  <span
                    key={t.type.name}
                    className="px-4 py-1 rounded-full text-white text-sm font-lato capitalize"
                    style={{ backgroundColor: getTypeColor(t.type.name) }}
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>

              {/* Height/Weight */}
              <div className="flex gap-6 mt-4 justify-center sm:justify-start">
                <div>
                  <p className="font-courier text-xs text-gray-400">Altezza</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.height / 10).toFixed(1)} m</p>
                </div>
                <div>
                  <p className="font-courier text-xs text-gray-400">Peso</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.weight / 10).toFixed(1)} kg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            data-testid="stats-tab"
            onClick={() => setActiveTab("stats")}
            className={`pb-3 px-4 font-cinzel transition-colors ${
              activeTab === "stats" 
                ? "text-[#2C3E50] border-b-2 border-[#D4AF37]" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Statistiche
          </button>
          <button
            data-testid="moves-tab"
            onClick={() => setActiveTab("moves")}
            className={`pb-3 px-4 font-cinzel transition-colors ${
              activeTab === "moves" 
                ? "text-[#2C3E50] border-b-2 border-[#D4AF37]" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Mosse (Scarlatto/Violetto)
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="bg-white gold-border rounded-lg p-6 mb-8 animate-fade-in">
            <h2 className="font-cinzel text-xl text-[#2C3E50] mb-6">Statistiche Base</h2>
            <div className="space-y-4">
              {pokemon.stats.map((stat) => (
                <div key={stat.stat.name} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <span style={{ color: getTypeColor(mainType) }}>
                      {getStatIcon(stat.stat.name)}
                    </span>
                    <span className="font-lato text-sm text-[#2C3E50]">
                      {getStatName(stat.stat.name)}
                    </span>
                  </div>
                  <span className="font-courier text-sm w-10 text-right">{stat.base_stat}</span>
                  <div className="flex-1">
                    <Progress 
                      value={(stat.base_stat / 255) * 100} 
                      className="h-3"
                      style={{ 
                        '--progress-background': getTypeColor(mainType)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-cinzel text-[#2C3E50]">Totale</span>
                <span className="font-courier text-lg text-[#D4AF37]">
                  {pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Moves Tab */}
        {activeTab === "moves" && (
          <div className="bg-white gold-border rounded-lg p-6 mb-8 animate-fade-in">
            <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">
              Mosse Apprendibili
            </h2>
            <p className="font-lato text-sm text-gray-500 mb-6">
              Mosse disponibili in Pokémon Scarlatto e Violetto
            </p>
            
            {moves.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {moves.map((move, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-[#D4AF37] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTypeColor(move.type) }}
                      ></span>
                      <div>
                        <p className="font-lato text-[#2C3E50] capitalize">{move.name}</p>
                        <p className="font-courier text-xs text-gray-400 capitalize">
                          {move.type} • {move.damageClass === "physical" ? "Fisico" : move.damageClass === "special" ? "Speciale" : "Stato"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {move.power && (
                        <p className="font-courier text-sm text-[#C0392B]">
                          PWR: {move.power}
                        </p>
                      )}
                      {move.accuracy && (
                        <p className="font-courier text-xs text-gray-400">
                          ACC: {move.accuracy}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500 font-lato">
                Nessuna mossa trovata per Scarlatto/Violetto
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
