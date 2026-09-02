import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { toast } from "sonner";
import axios from "axios";
import api from "../api";
import {
  ArrowLeft, Zap, Shield, Swords, Heart, Wind, Target, Disc,
  GraduationCap, Info, Edit2, Check, X, Search, Save, Trash2, Package
} from "lucide-react";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

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

const TYPE_COLORS = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#EE99AC"
};

const getTypeColor = (type) => TYPE_COLORS[type] || "#68A090";

const getDamageClassLabel = (damageClass) => {
  if (damageClass === "physical") return "Fisico";
  if (damageClass === "special") return "Speciale";
  return "Stato";
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

const getStatName = (stat) => ({
  hp: "PS",
  attack: "Attacco",
  defense: "Difesa",
  "special-attack": "Att. Speciale",
  "special-defense": "Dif. Speciale",
  speed: "Velocità"
}[stat] || stat);

const CustomStatsTable = ({ stats }) => {
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

  const getValue = (name) => stats.find(s => s.stat.name === name)?.base_stat || 0;

  const rows = [
    ["PS", getValue("hp"), classifyHP(getValue("hp")), false],
    ["Attacco", getValue("attack"), classifyAttack(getValue("attack")), false],
    ["Difesa", getValue("defense"), classifyDefense(getValue("defense")), false],
    ["Att. Speciale", getValue("special-attack"), classifyAttack(getValue("special-attack")), false],
    ["Dif. Speciale", getValue("special-defense"), classifySpecialDefense(getValue("special-defense")), false],
    ["Velocità", getValue("speed"), classifySpeed(getValue("speed")), true],
  ];

  const tierColors = ["#E74C3C", "#F39C12", "#3498DB", "#27AE60", "#8E44AD"];

  return (
    <div className="bg-white gold-border rounded-lg p-6">
      <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">Statistiche Ufficiali</h2>
      <p className="font-lato text-sm text-gray-500 mb-6">
        Classificazione ufficiale dell'Accademia Pokémon
      </p>
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
            {rows.map(([name, value, classification, isSpeed], index) => (
              <tr key={name} className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-gray-50/50" : ""}`}>
                <td className="py-3 px-4 font-lato text-sm text-[#2C3E50]">{name}</td>
                <td className="py-3 px-4 text-center font-courier text-sm text-gray-600">{value}</td>
                <td className="py-3 px-4 text-center">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                    style={{ backgroundColor: tierColors[classification.tier] }}
                  >
                    {classification.tier}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tierColors[classification.tier] }}
                  >
                    {classification.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TierLegend = () => (
  <div className="bg-white gold-border rounded-lg p-6">
    <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">Legenda Modificatori</h2>
    <p className="font-lato text-sm text-gray-500 mb-6">
      Bonus e malus applicati in base al Tier (tutte le stats tranne Velocità)
    </p>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-[#D4AF37]/30">
            <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Tier</th>
            <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Mod. Difese</th>
            <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">Mod. Attacchi</th>
            <th className="text-center py-3 px-4 font-cinzel text-sm text-[#2C3E50]">PS Bonus</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["0", "+10%", "+0%", "30"],
            ["1", "+0%", "+5%", "60"],
            ["2", "-10%", "+10%", "90"],
            ["3", "-20%", "+15%", "120"]
          ].map((row, index) => (
            <tr key={row[0]} className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-gray-50/50" : ""}`}>
              <td className="py-3 px-4 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                  style={{ backgroundColor: ["#E74C3C", "#F39C12", "#3498DB", "#27AE60"][index] }}>
                  {row[0]}
                </span>
              </td>
              <td className="py-3 px-4 text-center font-courier text-sm">{row[1]}</td>
              <td className="py-3 px-4 text-center font-courier text-sm">{row[2]}</td>
              <td className="py-3 px-4 text-center font-courier text-sm text-[#8E44AD] font-bold">{row[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="font-lato text-xs text-gray-400 mt-4">
      * La Velocità (Tier 0-4) non ha modificatori percentuali
    </p>
  </div>
);

// ============================================================
// NUOVO PANNELLO: 4 MOSSE APPRESE
// ============================================================
const LearnedMovesPanel = ({
  learnedMoves,
  moveSearches,
  setMoveSearches,
  onSelectMove,
  onRemoveMove,
  onSave,
  saving
}) => {
  const handleSearchChange = (index, value) => {
    setMoveSearches(prev => ({ ...prev, [index]: value }));
  };

  return (
    <div className="bg-white gold-border rounded-lg p-6 mb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div>
          <h2 className="font-cinzel text-xl text-[#2C3E50]">Mosse Apprese</h2>
          <p className="font-lato text-sm text-gray-500 mt-1">
            Seleziona fino a 4 mosse che il tuo Pokémon ha effettivamente appreso.
          </p>
        </div>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-[#2C3E50] hover:bg-[#34495E] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvataggio..." : "Salva mosse"}
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {learnedMoves.map((move, index) => {
          const search = moveSearches[index] || "";
          const isSearching = search.trim().length > 0 && !move;

          return (
            <div key={index} className="relative">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center font-cinzel text-sm text-[#8E44AD]">
                  {index + 1}
                </div>

                <div className="flex-1 relative">
                  {move ? (
                    <div className="flex items-center justify-between gap-3 p-3 border border-[#D4AF37] rounded-lg bg-[#FFFCF3]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getTypeColor(move.type) }}
                        />
                        <div className="min-w-0">
                          <p className="font-lato font-medium text-[#2C3E50] truncate">{move.name}</p>
                          <p className="font-courier text-xs text-gray-400">
                            {getDamageClassLabel(move.damageClass)}
                            {move.power ? ` · Pot. ${move.power}` : ""}
                            {move.tmNumber ? ` · MT${move.tmNumber}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMove(index)}
                        className="text-red-500 hover:bg-red-50 flex-shrink-0"
                        title="Rimuovi mossa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={search}
                          onChange={(e) => handleSearchChange(index, e.target.value)}
                          placeholder={`Cerca mossa per lo slot ${index + 1}...`}
                          className="pl-9"
                        />
                      </div>
                      {isSearching && (
                        <p className="text-xs text-gray-400 mt-1">
                          Usa i risultati che compariranno qui sotto.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!move && search.trim() && moveSearches[index + "_results"]?.length > 0 && (
                <div className="ml-12 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-56 overflow-y-auto z-20 relative">
                  {moveSearches[index + "_results"].map((candidate) => (
                    <button
                      key={`${index}-${candidate.englishName}`}
                      type="button"
                      onClick={() => onSelectMove(index, candidate)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getTypeColor(candidate.type) }}
                        />
                        <div className="min-w-0">
                          <p className="font-lato text-sm text-[#2C3E50] truncate">{candidate.name}</p>
                          <p className="font-courier text-[10px] text-gray-400">
                            {getDamageClassLabel(candidate.damageClass)}
                          </p>
                        </div>
                      </div>
                      <span className="font-courier text-xs text-gray-400 flex-shrink-0">
                        {candidate.tmNumber ? `MT${candidate.tmNumber}` : candidate.level != null ? `Lv. ${candidate.level}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!move && search.trim() && moveSearches[index + "_results"]?.length === 0 && (
                <p className="ml-12 mt-2 text-sm text-gray-400">
                  Nessuna mossa trovata tra quelle apprendibili da questo Pokémon.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="font-lato text-xs text-blue-700">
            La ricerca utilizza le mosse disponibili nella scheda <strong>Mosse</strong>
            {" "}del Pokémon, quindi non puoi assegnargli una mossa che non può apprendere.
          </p>
        </div>
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
  const [userPokemonData, setUserPokemonData] = useState(null);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [level, setLevel] = useState("");
  const [items, setItems] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [isItemMenuOpen, setIsItemMenuOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [movesLoading, setMovesLoading] = useState(true);

  // NUOVO: esattamente 4 slot
  const [learnedMoves, setLearnedMoves] = useState([null, null, null, null]);
  const [moveSearches, setMoveSearches] = useState({});
  const [savingMoves, setSavingMoves] = useState(false);

  const { pokemonId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchPokemonData();
    fetchUserPokemonData();
    fetchItems();
  }, [pokemonId, token]);

  const fetchItems = async () => {
    try {
      const cachedItems = sessionStorage.getItem("pokemon-held-items-it");
      if (cachedItems) {
        setItems(JSON.parse(cachedItems));
        return;
      }

      // L'attributo 5 di PokéAPI contiene gli strumenti assegnabili.
      const response = await axios.get("https://pokeapi.co/api/v2/item-attribute/5");
      const itemResources = response.data.items || [];
      const basicItems = itemResources.map(resource => ({
        name: resource.name,
        displayName: resource.name.replaceAll("-", " "),
        sprite: null,
        url: resource.url,
        translated: false
      }));
      setItems(basicItems);
      setItemsLoading(false);

      let nextIndex = 0;
      const translatedItems = [];

      // Un piccolo pool evita centinaia di richieste simultanee.
      const workers = Array.from({ length: 10 }, async () => {
        while (nextIndex < itemResources.length) {
          const resource = itemResources[nextIndex++];
          try {
            const detail = (await axios.get(resource.url)).data;
            translatedItems.push({
              name: detail.name,
              displayName: detail.names.find(entry => entry.language.name === "it")?.name
                || detail.names.find(entry => entry.language.name === "en")?.name
                || detail.name.replaceAll("-", " "),
              sprite: detail.sprites?.default || null,
              url: resource.url,
              translated: true
            });
          } catch {
            translatedItems.push({
              name: resource.name,
              displayName: resource.name.replaceAll("-", " "),
              sprite: null,
              url: resource.url,
              translated: false
            });
          }
        }
      });

      await Promise.all(workers);
      translatedItems.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
      setItems(translatedItems);
      sessionStorage.setItem("pokemon-held-items-it", JSON.stringify(translatedItems));
    } catch (error) {
      console.error(error);
      toast.error("Errore nel caricamento degli strumenti");
    } finally {
      setItemsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase("it");
    if (!query) return items.slice(0, 12);
    return items.filter(item =>
      item.displayName.toLocaleLowerCase("it").includes(query)
      || item.name.toLowerCase().includes(query)
    ).slice(0, 12);
  }, [items, itemSearch]);

  const selectedItem = items.find(item => item.name === selectedItemName);

  // Mantiene i 4 slot e carica ciò che è salvato nel backend.
  const normalizeLearnedMoves = (moves) => {
    const result = Array.isArray(moves) ? moves.slice(0, 4) : [];
    while (result.length < 4) result.push(null);
    return result;
  };

  const fetchUserPokemonData = async () => {
    try {
      const response = await api.get(`/pokemon/my/${pokemonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserPokemonData(response.data);
      setSelectedItemName(response.data.held_item?.name || "");
      setItemSearch(response.data.held_item?.display_name || "");
      setLevel(response.data.level?.toString() || "");
      setLearnedMoves(normalizeLearnedMoves(response.data.learned_moves));
    } catch (error) {
      console.log("Pokemon non assegnato all'utente o errore nel caricamento dati");
    }
  };

  const saveHeldItem = async () => {
    setSavingItem(true);
    try {
      let heldItem = null;
      if (selectedItemName) {
        const selected = items.find(item => item.name === selectedItemName);
        if (!selected) throw new Error("Strumento non valido");
        let itemToSave = selected;
        if (!selected.translated) {
          const detail = (await axios.get(selected.url)).data;
          itemToSave = {
            ...selected,
            displayName: detail.names.find(entry => entry.language.name === "it")?.name
              || detail.names.find(entry => entry.language.name === "en")?.name
              || detail.name.replaceAll("-", " "),
            sprite: detail.sprites?.default || null
          };
        }
        heldItem = {
          name: itemToSave.name,
          display_name: itemToSave.displayName,
          sprite: itemToSave.sprite
        };
      }
      const response = await api.put(`/pokemon/my/${pokemonId}`,
        { held_item: heldItem },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserPokemonData(response.data);
      toast.success(heldItem ? "Strumento assegnato!" : "Strumento rimosso!");
    } catch (error) {
      console.error(error);
      toast.error("Errore nel salvataggio dello strumento");
    } finally {
      setSavingItem(false);
    }
  };

  const saveLevel = async () => {
    const levelNum = parseInt(level);
    if (level && (isNaN(levelNum) || levelNum < 1 || levelNum > 100)) {
      toast.error("Il livello deve essere tra 1 e 100");
      return;
    }

    try {
      await api.put(`/pokemon/my/${pokemonId}`,
        { level: level ? levelNum : null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserPokemonData(prev => ({ ...prev, level: levelNum }));
      setIsEditingLevel(false);
      toast.success("Livello salvato!");
    } catch {
      toast.error("Errore nel salvataggio del livello");
    }
  };

  const saveLearnedMoves = async () => {
    if (!userPokemonData) {
      toast.error("Questo Pokémon non è assegnato al tuo account");
      return;
    }

    const selected = learnedMoves.filter(Boolean);

    if (selected.length !== new Set(selected.map(move => move.englishName)).size) {
      toast.error("Non puoi inserire la stessa mossa più volte");
      return;
    }

    setSavingMoves(true);

    try {
      const response = await api.put(
        `/pokemon/my/${pokemonId}`,
        { learned_moves: learnedMoves },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserPokemonData(response.data);
      setLearnedMoves(normalizeLearnedMoves(response.data.learned_moves));
      setMoveSearches({});
      toast.success("Mosse apprese salvate!");
    } catch (error) {
      console.error(error);
      toast.error("Errore nel salvataggio delle mosse apprese");
    } finally {
      setSavingMoves(false);
    }
  };

  const fetchPokemonData = async () => {
    try {
      const pokemonRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      setPokemon(pokemonRes.data);
      setLoading(false);
      void fetchSupportingPokemonData(pokemonRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Errore nel caricamento del Pokemon");
      navigate("/my-pokemon");
      setLoading(false);
    }
  };

  const fetchSupportingPokemonData = async (pokemonData) => {
    try {
      const speciesRes = await axios.get(pokemonData.species.url);
      setSpecies(speciesRes.data);

      let foundMoves = false;

      for (const versionGroup of VERSION_GROUPS) {
        const { levelUpMoves, machineMoves } = filterMovesByVersion(
          pokemonData.moves,
          versionGroup.name
        );

        if (levelUpMoves.length > 0 || machineMoves.length > 0) {
          foundMoves = true;

          levelUpMoves.sort((a, b) => a.level - b.level);

          const [levelMoveDetails, tmMoveDetails] = await Promise.all([
            fetchMoveDetails(levelUpMoves.slice(0, 50), true),
            fetchMoveDetails(machineMoves.slice(0, 60), false, versionGroup.name)
          ]);

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
      console.error(error);
      toast.error("Alcuni dati aggiuntivi del Pokémon non sono disponibili");
    } finally {
      setMovesLoading(false);
    }
  };

  const filterMovesByVersion = (moves, versionGroupName) => {
    const levelUpMoves = [];
    const machineMoves = [];

    moves.forEach(move => {
      const versionDetails = move.version_group_details.find(
        vgd => vgd.version_group.name === versionGroupName
      );

      if (!versionDetails) return;

      if (versionDetails.move_learn_method.name === "level-up") {
        levelUpMoves.push({
          ...move,
          level: versionDetails.level_learned_at
        });
      } else if (versionDetails.move_learn_method.name === "machine") {
        machineMoves.push(move);
      }
    });

    return { levelUpMoves, machineMoves };
  };

  const fetchMoveDetails = async (moves, isLevelUp, versionGroupName = null) => {
    const moveDetails = await Promise.all(
      moves.map(async (move) => {
        try {
          const moveRes = await axios.get(move.move.url);

          const italianName =
            moveRes.data.names.find(n => n.language.name === "it")?.name ||
            moveRes.data.name;

          let tmNumber = null;

          if (!isLevelUp && versionGroupName) {
            const versionMachine = moveRes.data.machines.find(
              m => m.version_group.name === versionGroupName
            );

            if (versionMachine) {
              try {
                const machineRes = await axios.get(versionMachine.machine.url);
                const itemName = machineRes.data.item.name;
                const match = itemName.match(/tm(\d+)/i);
                if (match) tmNumber = match[1];
              } catch {
                // Il numero MT non è fondamentale per la ricerca.
              }
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
            tmNumber
          };
        } catch {
          return null;
        }
      })
    );

    return moveDetails.filter(Boolean);
  };

  // Unisce livello + MT e rimuove eventuali duplicati.
  const allLearnableMoves = useMemo(() => {
    const map = new Map();

    [...levelMoves, ...tmMoves].forEach(move => {
      if (!map.has(move.englishName)) {
        map.set(move.englishName, move);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "it")
    );
  }, [levelMoves, tmMoves]);

  // Aggiorna i risultati di ricerca di ogni slot.
  useEffect(() => {
    const nextSearches = { ...moveSearches };

    for (let i = 0; i < 4; i++) {
      const query = (moveSearches[i] || "").trim().toLowerCase();

      if (!query) {
        nextSearches[`${i}_results`] = [];
        continue;
      }

      const alreadySelected = new Set(
        learnedMoves.filter(Boolean).map(move => move.englishName)
      );

      // Non escludiamo la mossa selezionata nello stesso slot.
      if (learnedMoves[i]) {
        alreadySelected.delete(learnedMoves[i].englishName);
      }

      nextSearches[`${i}_results`] = allLearnableMoves
        .filter(move => {
          const matches =
            move.name.toLowerCase().includes(query) ||
            move.englishName.toLowerCase().includes(query);

          return matches && !alreadySelected.has(move.englishName);
        })
        .slice(0, 10);
    }

    setMoveSearches(nextSearches);
  }, [allLearnableMoves, learnedMoves, moveSearches[0], moveSearches[1], moveSearches[2], moveSearches[3]]);

  const selectLearnedMove = (index, move) => {
    setLearnedMoves(prev => {
      const next = [...prev];
      next[index] = move;
      return next;
    });

    setMoveSearches(prev => ({
      ...prev,
      [index]: "",
      [`${index}_results`]: []
    }));
  };

  const removeLearnedMove = (index) => {
    setLearnedMoves(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    setMoveSearches(prev => ({
      ...prev,
      [index]: "",
      [`${index}_results`]: []
    }));
  };

  const getItalianName = () => {
    if (!species) return pokemon?.name;
    return species.names.find(n => n.language.name === "it")?.name || pokemon?.name;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-pulse text-center">
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
      <header
        className="shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${getTypeColor(mainType)}, ${getTypeColor(pokemon.types[1]?.type.name || mainType)})`
        }}
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

      <div
        className="relative pb-8"
        style={{ background: `linear-gradient(180deg, ${getTypeColor(mainType)}40, transparent)` }}
      >
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
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

            <div className="text-center sm:text-left flex-1">
              <p className="font-courier text-gray-500 mb-1">
                #{pokemon.id.toString().padStart(3, "0")}
              </p>

              <div className="mb-3">
                <h1
                  data-testid="pokemon-name"
                  className="font-cinzel text-3xl sm:text-4xl text-[#2C3E50] capitalize"
                >
                  {getItalianName()}
                </h1>

                {userPokemonData && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 justify-center sm:justify-start">
                    <div className="relative text-left">
                      <span className="block font-courier text-xs text-gray-400 mb-1">Strumento</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          data-testid="held-item-search"
                          value={itemSearch}
                          onChange={(event) => {
                            setItemSearch(event.target.value);
                            setSelectedItemName("");
                            setIsItemMenuOpen(true);
                          }}
                          onFocus={() => setIsItemMenuOpen(true)}
                          onBlur={() => setTimeout(() => setIsItemMenuOpen(false), 150)}
                          placeholder={itemsLoading ? "Caricamento strumenti..." : "Cerca uno strumento..."}
                          disabled={itemsLoading}
                          autoComplete="off"
                          className="w-64 h-10 pl-9 pr-9 bg-white border-2 border-[#D4AF37]/30 rounded-lg text-sm font-lato outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 disabled:bg-gray-50"
                        />
                        {(itemSearch || selectedItemName) && (
                          <button
                            type="button"
                            aria-label="Rimuovi strumento"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setItemSearch("");
                              setSelectedItemName("");
                              setIsItemMenuOpen(true);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#C0392B]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isItemMenuOpen && !itemsLoading && (
                        <div className="absolute z-30 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-[#D4AF37]/40 rounded-lg shadow-xl">
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSelectedItemName("");
                              setItemSearch("");
                              setIsItemMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm font-lato text-gray-500 hover:bg-[#D4AF37]/10 border-b border-gray-100"
                          >
                            Nessuno strumento
                          </button>
                          {filteredItems.map(item => (
                            <button
                              type="button"
                              key={item.name}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setSelectedItemName(item.name);
                                setItemSearch(item.displayName);
                                setIsItemMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-[#D4AF37]/10"
                            >
                              {item.sprite ? (
                                <img src={item.sprite} alt="" className="w-7 h-7 object-contain" />
                              ) : (
                                <Package className="w-5 h-5 mx-1 text-gray-400" />
                              )}
                              <span className="font-lato text-sm text-[#2C3E50]">{item.displayName}</span>
                            </button>
                          ))}
                          {filteredItems.length === 0 && (
                            <p className="px-3 py-4 text-center text-sm text-gray-500 font-lato">
                              Nessuno strumento trovato
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      data-testid="save-held-item"
                      size="sm"
                      onClick={saveHeldItem}
                      disabled={savingItem || itemsLoading}
                      className="h-10 bg-[#D4AF37] hover:bg-[#b8941f] text-white"
                    >
                      {savingItem ? "Salvataggio..." : (
                        <>
                          <Package className="w-4 h-4 mr-1" />
                          {selectedItem ? "Assegna" : "Rimuovi"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center sm:justify-start">
                {pokemon.types.map(t => (
                  <span
                    key={t.type.name}
                    className="px-4 py-1 rounded-full text-white text-sm font-lato capitalize"
                    style={{ backgroundColor: getTypeColor(t.type.name) }}
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>

              <div className="flex gap-6 mt-4 justify-center sm:justify-start flex-wrap">
                <div>
                  <p className="font-courier text-xs text-gray-400">Altezza</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.height / 10).toFixed(1)} m</p>
                </div>

                <div>
                  <p className="font-courier text-xs text-gray-400">Peso</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.weight / 10).toFixed(1)} kg</p>
                </div>

                {userPokemonData && (
                  <div>
                    <p className="font-courier text-xs text-gray-400">Livello</p>
                    {isEditingLevel ? (
                      <div className="flex items-center gap-1">
                        <Input
                          data-testid="level-input"
                          type="number"
                          min="1"
                          max="100"
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="w-16 h-7 text-sm text-center"
                        />
                        <Button size="sm" variant="ghost" onClick={saveLevel} className="h-7 w-7 p-0 text-green-600">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingLevel(false);
                            setLevel(userPokemonData.level?.toString() || "");
                          }}
                          className="h-7 w-7 p-0 text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="font-lato text-[#2C3E50]">{userPokemonData.level || "—"}</span>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingLevel(true)} className="h-6 w-6 p-0 text-gray-400">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* TAB PRINCIPALI: aggiunta Mosse Apprese */}
        <div className="flex gap-2 sm:gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            data-testid="stats-tab"
            onClick={() => setActiveTab("stats")}
            className={`whitespace-nowrap pb-3 px-3 sm:px-4 font-cinzel transition-colors ${
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
            className={`whitespace-nowrap pb-3 px-3 sm:px-4 font-cinzel transition-colors ${
              activeTab === "moves"
                ? "text-[#2C3E50] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Mosse
          </button>

          <button
            data-testid="learned-moves-tab"
            onClick={() => setActiveTab("learnedMoves")}
            className={`whitespace-nowrap pb-3 px-3 sm:px-4 font-cinzel transition-colors ${
              activeTab === "learnedMoves"
                ? "text-[#2C3E50] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Mosse Apprese
          </button>
        </div>

        {activeTab === "stats" && (
          <div className="space-y-6 mb-8 animate-fade-in">
            <div className="bg-white gold-border rounded-lg p-6">
              <h2 className="font-cinzel text-xl text-[#2C3E50] mb-6">Statistiche Base</h2>
              <div className="space-y-4">
                {pokemon.stats.map(stat => (
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
                        style={{ "--progress-background": getTypeColor(mainType) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-cinzel text-[#2C3E50]">Totale</span>
                <span className="font-courier text-lg text-[#D4AF37]">
                  {pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)}
                </span>
              </div>
            </div>

            <CustomStatsTable stats={pokemon.stats} />
            <TierLegend />
          </div>
        )}

        {activeTab === "moves" && (
          <div className="bg-white gold-border rounded-lg p-6 mb-8 animate-fade-in">
            <h2 className="font-cinzel text-xl text-[#2C3E50] mb-2">Mosse Apprendibili</h2>

            {movesLoading && (
              <div className="flex items-center gap-3 my-4 p-4 bg-gray-50 rounded-lg text-gray-500">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <p className="font-lato text-sm">Caricamento delle mosse in background...</p>
              </div>
            )}

            {dataSource && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p className="font-lato text-sm text-blue-700">
                  Dati recuperati da: <strong>{dataSource.displayName}</strong>
                </p>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <button
                data-testid="level-moves-tab"
                onClick={() => setMovesSubTab("level")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-lato text-sm ${
                  movesSubTab === "level" ? "bg-[#2C3E50] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Per Livello ({levelMoves.length})
              </button>

              <button
                data-testid="tm-moves-tab"
                onClick={() => setMovesSubTab("tm")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-lato text-sm ${
                  movesSubTab === "tm" ? "bg-[#8E44AD] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Disc className="w-4 h-4" />
                MT ({tmMoves.length})
              </button>
            </div>

            {!movesLoading && movesSubTab === "level" && (
              levelMoves.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg font-courier text-xs text-gray-500">
                    <div className="col-span-2">LIV.</div>
                    <div className="col-span-4">MOSSA</div>
                    <div className="col-span-2">TIPO</div>
                    <div className="col-span-2">POT.</div>
                    <div className="col-span-2">PREC.</div>
                  </div>

                  {levelMoves.map((move, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-gray-100 hover:border-[#D4AF37]">
                      <div className="col-span-2">
                        <span className="inline-flex items-center justify-center w-10 h-8 bg-[#2C3E50] text-white rounded font-courier text-sm font-bold">
                          {move.level === 0 ? "—" : move.level}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <p className="font-lato text-[#2C3E50]">{move.name}</p>
                        <p className="font-courier text-xs text-gray-400">{getDamageClassLabel(move.damageClass)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: getTypeColor(move.type) }} />
                        <span className="font-lato text-xs text-gray-600 hidden sm:inline capitalize">{move.type}</span>
                      </div>
                      <div className="col-span-2 font-courier text-sm text-[#C0392B]">{move.power || "—"}</div>
                      <div className="col-span-2 font-courier text-sm text-gray-500">{move.accuracy ? `${move.accuracy}%` : "—"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500 font-lato">Nessuna mossa per livello trovata</p>
              )
            )}

            {!movesLoading && movesSubTab === "tm" && (
              tmMoves.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#8E44AD]/10 rounded-lg font-courier text-xs text-gray-500">
                    <div className="col-span-2">MT</div>
                    <div className="col-span-4">MOSSA</div>
                    <div className="col-span-2">TIPO</div>
                    <div className="col-span-2">POT.</div>
                    <div className="col-span-2">PREC.</div>
                  </div>

                  {tmMoves.map((move, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-gray-100 hover:border-[#8E44AD]">
                      <div className="col-span-2">
                        <span className="inline-flex items-center justify-center w-10 h-8 bg-[#8E44AD] text-white rounded font-courier text-xs font-bold">
                          {move.tmNumber ? move.tmNumber : "MT"}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <p className="font-lato text-[#2C3E50]">{move.name}</p>
                        <p className="font-courier text-xs text-gray-400">{getDamageClassLabel(move.damageClass)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: getTypeColor(move.type) }} />
                        <span className="font-lato text-xs text-gray-600 hidden sm:inline capitalize">{move.type}</span>
                      </div>
                      <div className="col-span-2 font-courier text-sm text-[#C0392B]">{move.power || "—"}</div>
                      <div className="col-span-2 font-courier text-sm text-gray-500">{move.accuracy ? `${move.accuracy}%` : "—"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500 font-lato">Nessuna mossa MT trovata</p>
              )
            )}
          </div>
        )}

        {activeTab === "learnedMoves" && (
          userPokemonData ? (
            <LearnedMovesPanel
              learnedMoves={learnedMoves}
              moveSearches={moveSearches}
              setMoveSearches={setMoveSearches}
              onSelectMove={selectLearnedMove}
              onRemoveMove={removeLearnedMove}
              onSave={saveLearnedMoves}
              saving={savingMoves}
            />
          ) : (
            <div className="bg-white gold-border rounded-lg p-6 mb-8">
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-5 h-5 text-amber-500" />
                <p className="font-lato text-sm text-amber-700">
                  Questo Pokémon non è assegnato al tuo account, quindi non puoi modificare le sue mosse apprese.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
