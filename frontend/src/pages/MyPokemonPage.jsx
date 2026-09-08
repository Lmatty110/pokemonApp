import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import api from "../api";
import { ArrowLeft, Search, Package, Plus, Shield, X } from "lucide-react";

export default function MyPokemonPage() {
  const [pokemon, setPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTeam, setActiveTeam] = useState([]);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchMyPokemon();
  }, [token]);

  const fetchMyPokemon = async () => {
    try {
      const [pokemonResponse, teamResponse] = await Promise.all([
        api.get(`/pokemon/my`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/pokemon/active-team`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPokemon(pokemonResponse.data);
      setActiveTeam(teamResponse.data);
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

  const updateTeam = async (nextTeam) => {
    const previousTeam = activeTeam;
    setActiveTeam(nextTeam);
    try {
      await api.put("/pokemon/active-team", { pokemon_ids: nextTeam.map((entry) => entry.id) });
      toast.success("Squadra attiva aggiornata");
    } catch (error) {
      setActiveTeam(previousTeam);
      toast.error(error.response?.data?.detail || "Impossibile aggiornare la squadra");
    }
  };

  const toggleActivePokemon = (selectedPokemon) => {
    const isActive = activeTeam.some((entry) => entry.id === selectedPokemon.id);
    if (isActive) return updateTeam(activeTeam.filter((entry) => entry.id !== selectedPokemon.id));
    if (activeTeam.length >= 3) return toast.error("La Squadra Attiva può contenere al massimo 3 Pokémon");
    updateTeam([...activeTeam, selectedPokemon]);
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

        {pokemon.length > 0 && (
          <section className="mb-10 bg-white gold-border rounded-lg p-5 sm:p-7 shadow-md">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div><h2 className="font-cinzel text-xl sm:text-2xl text-[#2C3E50] flex items-center gap-2"><Shield className="text-[#D4AF37]" /> Squadra Attiva</h2><p className="font-lato text-sm text-gray-500 mt-1">Scegli fino a 3 Pokémon dalla tua collezione.</p></div>
              <span className="font-cinzel text-[#8E44AD]">{activeTeam.length}/3</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }, (_, index) => { const member = activeTeam[index]; return member ? (
                <div key={member.id} onClick={() => navigate(`/pokemon/${member.pokemon_id}`)} className="relative min-h-40 rounded-lg border-2 border-[#D4AF37] bg-gradient-to-b from-[#FFF9E6] to-white p-3 cursor-pointer group flex items-center gap-3">
                  <button onClick={(event) => { event.stopPropagation(); toggleActivePokemon(member); }} aria-label={`Rimuovi ${member.nickname || member.pokemon_name} dalla squadra`} className="absolute right-2 top-2 w-8 h-8 min-w-0 min-h-0 rounded-full bg-red-500 text-white flex items-center justify-center z-10"><X className="w-4 h-4" /></button>
                  <img src={getPokemonSprite(member.pokemon_id)} alt={member.pokemon_name} className="w-28 h-28 object-contain group-hover:scale-105 transition-transform" />
                  <div className="min-w-0"><p className="font-cinzel text-[#2C3E50] capitalize truncate">{member.nickname || member.pokemon_name}</p>{member.nickname && <p className="font-lato text-xs text-gray-400 capitalize">{member.pokemon_name}</p>}<p className="font-courier text-sm text-[#8E44AD] mt-2">Liv. {member.level ?? "--"}</p>{member.held_item && <div className="flex items-center gap-1 mt-2" title={member.held_item.display_name}>{member.held_item.sprite ? <img src={member.held_item.sprite} alt="" className="w-7 h-7 object-contain" /> : <Package className="w-5 h-5" />}<span className="text-xs font-lato truncate">{member.held_item.display_name}</span></div>}</div>
                </div>
              ) : <div key={index} className="min-h-40 rounded-lg border-2 border-dashed border-[#D4AF37]/50 bg-[#FDFBF7] flex flex-col items-center justify-center text-gray-300"><Plus className="w-9 h-9" /><span className="font-lato text-sm mt-2">Slot squadra</span></div>; })}
            </div>
          </section>
        )}

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
                  {p.held_item && (
                    <div
                      data-testid={`held-item-${index}`}
                      title={`Strumento: ${p.held_item.display_name}`}
                      className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-white border-2 border-[#D4AF37] shadow-md flex items-center justify-center"
                    >
                      {p.held_item.sprite ? (
                        <img
                          src={p.held_item.sprite}
                          alt={p.held_item.display_name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-[#D4AF37]" />
                      )}
                    </div>
                  )}
                </div>
                <p className="font-cinzel text-center text-[#2C3E50] mt-2 capitalize text-sm">
                  {p.pokemon_name}
                </p>
                <p className="font-courier text-center text-gray-400 text-xs">
                  #{p.pokemon_id.toString().padStart(3, '0')}
                </p>
                <button
                  onClick={(event) => { event.stopPropagation(); toggleActivePokemon(p); }}
                  className={`mt-3 w-full min-h-9 rounded-md text-xs font-lato flex items-center justify-center gap-1 ${activeTeam.some((entry) => entry.id === p.id) ? "bg-[#D4AF37] text-white" : "bg-[#2C3E50] text-white hover:bg-[#34495E]"}`}
                >
                  {activeTeam.some((entry) => entry.id === p.id) ? <><X className="w-3 h-3" /> Rimuovi</> : <><Plus className="w-3 h-3" /> In squadra</>}
                </button>
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
