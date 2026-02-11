import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Zap, Shield, Swords, Heart, Wind, Target, Disc, GraduationCap, Info } from "lucide-react";
import { Progress } from "../components/ui/progress";

// Version groups in order from newest to oldest
const VERSION_GROUPS = [
  { name: "scarlet-violet", displayName: "Pokémon Scarlatto e Violetto" },
  { name: "sword-shield", displayName: "Pokémon Spada e Scudo" },
  { name: "ultra-sun-ultra-moon", displayName: "Pokémon Ultrasole e Ultraluna" },
  { name: "sun-moon", displayName: "Pokémon Sole e Luna" },
  { name: "omega-ruby-alpha-sapphire", displayName: "Pokémon Rubino Omega e Zaffiro Alpha" },
  { name: "x-y", displayName: "Pokémon X e Y" },
  { name: "black-2-white-2", displayName: "Pokémon Nero 2 e Bianco 2" },
  { name: "black-white", displayName: "Pokémon Nero e Bianco" },
];

// Custom Stats Classification Component
const CustomStatsTable = ({ stats, typeColor }) => {
  // Classification functions
  const classifySpeed = (value) => {
    if (value <= 39) return { tier: 0, label: "Molto Lenti" };
    if (value <= 69) return { tier: 1, label: "Lenti" };
    if (value <= 89) return { tier: 2, label: "Medi" };
    if (value <= 129) return { tier: 3, label: "Veloci" };
    return { tier: 4, label: "Molto Veloci" };
  };

  const classifyDefense = (value) => {
    if (value <= 64) return { tier: 0, label: "Fragili" };
    if (value <= 94) return { tier: 1, label: "Resistenti" };
    if (value <= 129) return { tier: 2, label: "Resistenti" };
    return { tier: 3, label: "Forti" };
  };

  const classifyAttack = (value) => {
    if (value <= 64) return { tier: 0, label: "Deboli" };
    if (value <= 94) return { tier: 1, label: "Medi" };
    if (value <= 129) return { tier: 2, label: "Forti" };
    return { tier: 3, label: "Molto Forti" };
  };

  const classifySpecialAttack = (value) => {
    if (value <= 64) return { tier: 0, label: "Deboli" };
    if (value <= 94) return { tier: 1, label: "Medi" };
    if (value <= 129) return { tier: 2, label: "Forti" };
    return { tier: 3, label: "Molto Forti" };
  };

  const classifySpecialDefense = (value) => {
    if (value <= 64) return { tier: 0, label: "Fragili" };
    if (value <= 94) return { tier: 1, label: "Medi" };
    if (value <= 129) return { tier: 2, label: "Resistenti" };
    return { tier: 3, label: "Forti" };
  };

  const classifyHP = (value) => {
    if (value <= 65) return { tier: 0, label: "Fragili" };
    if (value <= 100) return { tier: 1, label: "Medi" };
    if (value <= 159) return { tier: 2, label: "Resistenti" };
    return { tier: 3, label: "Molto Resistenti" };
  };

  // Get stats values
  const getStatValue = (statName) => {
    const stat = stats.find(s => s.stat.name === statName);
    return stat ? stat.base_stat : 0;
  };

  const hp = getStatValue("hp");
  const attack = getStatValue("attack");
  const defense = getStatValue("defense");
  const spAttack = getStatValue("special-attack");
  const spDefense = getStatValue("special-defense");
  const speed = getStatValue("speed");

  // Classify all stats
  const classifications = {
    hp: classifyHP(hp),
    attack: classifyAttack(attack),
    defense: classifyDefense(defense),
    spAttack: classifySpecialAttack(spAttack),
    spDefense: classifySpecialDefense(spDefense),
    speed: classifySpeed(speed),
  };

  // Get tier color
  const getTierColor = (tier, maxTier = 3) => {
    const colors = ["#E74C3C", "#F39C12", "#3498DB", "#27AE60", "#8E44AD"];
    return colors[tier] || colors[0];
  };

  const statRows = [
    { name: "PS", original: hp, classification: classifications.hp, statType: "hp" },
    { name: "Attacco", original: attack, classification: classifications.attack, statType: "attack" },
    { name: "Difesa", original: defense, classification: classifications.defense, statType: "defense" },
    { name: "Att. Speciale", original: spAttack, classification: classifications.spAttack, statType: "spAttack" },
    { name: "Dif. Speciale", original: spDefense, classification: classifications.spDefense, statType: "spDefense" },
    { name: "Velocità", original: speed, classification: classifications.speed, statType: "speed" },
  ];

  return (
    <div className="bg-white gold-border rounded-lg p-6">
      <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">Statistiche Ufficiali</h2>
      <p className="font-lato text-sm text-gray-500 mb-6">
        Classificazione ufficiale dell'Accademia Pokémon
      </p>

      {/* Classification Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#D4AF37]/30">
              <th className="text-left py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Statistica</th>
              <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Valore</th>
              <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Tier</th>
              <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Classe</th>
            </tr>
          </thead>
          <tbody>
            {statRows.map((row, index) => {
              const isSpeed = row.statType === "speed";
              
              return (
                <tr 
                  key={row.statType}
                  className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="py-3 px-4">
                    <span className="font-lato text-sm text-[#2C3E50]">{row.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-courier text-sm text-gray-600">{row.original}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span 
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                      style={{ backgroundColor: getTierColor(row.classification.tier, isSpeed ? 4 : 3) }}
                    >
                      {row.classification.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getTierColor(row.classification.tier, isSpeed ? 4 : 3) }}
                    >
                      {row.classification.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function PokemonDetailPage() {
  const [pokemon, setPokemon] = useState(null);
  const [species, setSpecies] = useState(null);
  const [levelMoves, setLevelMoves] = useState([]);
  const [tmMoves, setTmMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");
  const [movesSubTab, setMovesSubTab] = useState("level");
  const [dataSource, setDataSource] = useState(null);
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

      // Try to find moves from available version groups
      let foundMoves = false;
      let usedVersionGroup = null;

      for (const versionGroup of VERSION_GROUPS) {
        const { levelUpMoves, machineMoves } = filterMovesByVersion(
          pokemonRes.data.moves,
          versionGroup.name
        );

        if (levelUpMoves.length > 0 || machineMoves.length > 0) {
          foundMoves = true;
          usedVersionGroup = versionGroup;

          // Sort level-up moves by level
          levelUpMoves.sort((a, b) => a.level - b.level);

          // Fetch move details for level-up moves
          const levelMoveDetails = await fetchMoveDetails(levelUpMoves.slice(0, 50), true);
          
          // Fetch move details for TM moves
          const tmMoveDetails = await fetchMoveDetails(machineMoves.slice(0, 60), false, versionGroup.name);

          setLevelMoves(levelMoveDetails);
          setTmMoves(tmMoveDetails);
          setDataSource(versionGroup);
          break;
        }
      }

      if (!foundMoves) {
        setLevelMoves([]);
        setTmMoves([]);
        setDataSource(null);
      }
    } catch (error) {
      toast.error("Errore nel caricamento del Pokemon");
      navigate("/my-pokemon");
    } finally {
      setLoading(false);
    }
  };

  const filterMovesByVersion = (moves, versionGroupName) => {
    const levelUpMoves = [];
    const machineMoves = [];

    moves.forEach(move => {
      const versionDetails = move.version_group_details.find(vgd => 
        vgd.version_group.name === versionGroupName
      );
      
      if (versionDetails) {
        if (versionDetails.move_learn_method.name === "level-up") {
          levelUpMoves.push({
            ...move,
            level: versionDetails.level_learned_at
          });
        } else if (versionDetails.move_learn_method.name === "machine") {
          machineMoves.push(move);
        }
      }
    });

    return { levelUpMoves, machineMoves };
  };

  const fetchMoveDetails = async (moves, isLevelUp, versionGroupName = null) => {
    const moveDetails = await Promise.all(
      moves.map(async (move) => {
        try {
          const moveRes = await axios.get(move.move.url);
          const italianName = moveRes.data.names.find(n => n.language.name === "it")?.name || moveRes.data.name;
          
          let tmNumber = null;
          if (!isLevelUp && versionGroupName) {
            // Try to get TM number from machines
            const versionMachine = moveRes.data.machines.find(m => 
              m.version_group.name === versionGroupName
            );
            if (versionMachine) {
              try {
                const machineRes = await axios.get(versionMachine.machine.url);
                const itemName = machineRes.data.item.name;
                const match = itemName.match(/tm(\d+)/i);
                if (match) tmNumber = match[1];
              } catch {}
            }
          }

          return {
            name: italianName,
            englishName: moveRes.data.name,
            type: moveRes.data.type.name,
            power: moveRes.data.power,
            accuracy: moveRes.data.accuracy,
            pp: moveRes.data.pp,
            damageClass: moveRes.data.damage_class.name,
            level: isLevelUp ? move.level : null,
            tmNumber: tmNumber
          };
        } catch {
          return null;
        }
      })
    );

    return moveDetails.filter(m => m !== null);
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
            Mosse
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6 mb-8 animate-fade-in">
            {/* Base Stats */}
            <div className="bg-white gold-border rounded-lg p-6">
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

            {/* Custom Classification Table */}
            <CustomStatsTable stats={pokemon.stats} typeColor={getTypeColor(mainType)} />
          </div>
        )}

        {/* Moves Tab */}
        {activeTab === "moves" && (
          <div className="bg-white gold-border rounded-lg p-6 mb-8 animate-fade-in">
            <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">
              Mosse Apprendibili
            </h2>
            
            {/* Data Source Info */}
            {dataSource && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p className="font-lato text-sm text-blue-700">
                  Dati recuperati da: <strong>{dataSource.displayName}</strong>
                </p>
              </div>
            )}

            {!dataSource && (levelMoves.length === 0 && tmMoves.length === 0) && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="font-lato text-sm text-amber-700">
                  Nessun dato disponibile per questo Pokémon nei giochi supportati.
                </p>
              </div>
            )}

            {/* Moves Sub-tabs */}
            <div className="flex gap-2 mb-6">
              <button
                data-testid="level-moves-tab"
                onClick={() => setMovesSubTab("level")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-lato text-sm transition-colors ${
                  movesSubTab === "level"
                    ? "bg-[#2C3E50] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Per Livello ({levelMoves.length})
              </button>
              <button
                data-testid="tm-moves-tab"
                onClick={() => setMovesSubTab("tm")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-lato text-sm transition-colors ${
                  movesSubTab === "tm"
                    ? "bg-[#8E44AD] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Disc className="w-4 h-4" />
                MT ({tmMoves.length})
              </button>
            </div>

            {/* Level-up Moves */}
            {movesSubTab === "level" && (
              <>
                {levelMoves.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg font-courier text-xs text-gray-500">
                      <div className="col-span-2">LIV.</div>
                      <div className="col-span-4">MOSSA</div>
                      <div className="col-span-2">TIPO</div>
                      <div className="col-span-2">POT.</div>
                      <div className="col-span-2">PREC.</div>
                    </div>
                    
                    {levelMoves.map((move, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-gray-100 hover:border-[#D4AF37] transition-colors"
                      >
                        {/* Level */}
                        <div className="col-span-2">
                          <span className="inline-flex items-center justify-center w-10 h-8 bg-[#2C3E50] text-white rounded font-courier text-sm font-bold">
                            {move.level === 0 ? "—" : move.level}
                          </span>
                        </div>
                        
                        {/* Move Name */}
                        <div className="col-span-4">
                          <p className="font-lato text-[#2C3E50] capitalize">{move.name}</p>
                          <p className="font-courier text-xs text-gray-400 capitalize">
                            {move.damageClass === "physical" ? "Fisico" : move.damageClass === "special" ? "Speciale" : "Stato"}
                          </p>
                        </div>
                        
                        {/* Type */}
                        <div className="col-span-2">
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-1"
                            style={{ backgroundColor: getTypeColor(move.type) }}
                          ></span>
                          <span className="font-lato text-xs text-gray-600 capitalize hidden sm:inline">{move.type}</span>
                        </div>
                        
                        {/* Power */}
                        <div className="col-span-2">
                          <span className="font-courier text-sm text-[#C0392B]">
                            {move.power || "—"}
                          </span>
                        </div>
                        
                        {/* Accuracy */}
                        <div className="col-span-2">
                          <span className="font-courier text-sm text-gray-500">
                            {move.accuracy ? `${move.accuracy}%` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500 font-lato">
                    Nessuna mossa per livello trovata
                  </p>
                )}
              </>
            )}

            {/* TM Moves */}
            {movesSubTab === "tm" && (
              <>
                {tmMoves.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#8E44AD]/10 rounded-lg font-courier text-xs text-gray-500">
                      <div className="col-span-2">MT</div>
                      <div className="col-span-4">MOSSA</div>
                      <div className="col-span-2">TIPO</div>
                      <div className="col-span-2">POT.</div>
                      <div className="col-span-2">PREC.</div>
                    </div>
                    
                    {tmMoves.map((move, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-gray-100 hover:border-[#8E44AD] transition-colors"
                      >
                        {/* TM Number */}
                        <div className="col-span-2">
                          <span className="inline-flex items-center justify-center w-10 h-8 bg-[#8E44AD] text-white rounded font-courier text-xs font-bold">
                            {move.tmNumber ? `${move.tmNumber}` : "MT"}
                          </span>
                        </div>
                        
                        {/* Move Name */}
                        <div className="col-span-4">
                          <p className="font-lato text-[#2C3E50] capitalize">{move.name}</p>
                          <p className="font-courier text-xs text-gray-400 capitalize">
                            {move.damageClass === "physical" ? "Fisico" : move.damageClass === "special" ? "Speciale" : "Stato"}
                          </p>
                        </div>
                        
                        {/* Type */}
                        <div className="col-span-2">
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-1"
                            style={{ backgroundColor: getTypeColor(move.type) }}
                          ></span>
                          <span className="font-lato text-xs text-gray-600 capitalize hidden sm:inline">{move.type}</span>
                        </div>
                        
                        {/* Power */}
                        <div className="col-span-2">
                          <span className="font-courier text-sm text-[#C0392B]">
                            {move.power || "—"}
                          </span>
                        </div>
                        
                        {/* Accuracy */}
                        <div className="col-span-2">
                          <span className="font-courier text-sm text-gray-500">
                            {move.accuracy ? `${move.accuracy}%` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500 font-lato">
                    Nessuna mossa MT trovata
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
