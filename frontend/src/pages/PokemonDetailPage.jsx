import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { toast } from "sonner";
import axios from "axios";
import api from "../api";
import PokemonEvolution from "../components/PokemonEvolution";
import PokemonAbility from "../components/PokemonAbility";
import LearnableMovesList from "../components/LearnableMovesList";
import MoveEffectsDialog from "../components/MoveEffectsDialog";
import { MoveEffectsButton, MovePower, MoveType } from "../components/MoveInfo";
import { getDamageClassLabel, getTypeColor } from "../lib/moves";
import { getMoveData } from "../lib/moveData";
import useAutoSave from "../hooks/useAutoSave";
import AutoSaveStatus from "../components/AutoSaveStatus";
import { changedFields, recoverPendingSave } from "../lib/autoSave";
import {
  ArrowLeft, Zap, Shield, Swords, Heart, Wind, Target, Disc, Calculator,
  GraduationCap, Info, X, Search, Trash2, Package
} from "lucide-react";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

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
        <table className="w-full min-w-[420px]">
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
      <table className="w-full min-w-[420px]">
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
  autoSave,
  onShowEffects
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
        <AutoSaveStatus state={autoSave} testId="moves-autosave-status" />
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

                <div className="flex-1 min-w-0 relative">
                  {move ? (
                    <div data-testid={`learned-move-${index + 1}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-[#D4AF37] rounded-lg bg-[#FFFCF3]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-lato font-medium text-[#2C3E50] break-words">{move.name}</p>
                          <MoveType type={move.type} />
                          <p className="font-courier text-xs text-gray-400">
                            {getDamageClassLabel(move.damageClass)}
                            {move.tmNumber ? ` · MT${move.tmNumber}` : ""}
                          </p>
                          <div className="mt-1 text-xs text-gray-500">Potenza: <MovePower power={move.power} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                      <MoveEffectsButton move={move} onShow={onShowEffects} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMove(index)}
                        className="text-red-500 hover:bg-red-50 flex-shrink-0"
                        title="Rimuovi mossa"
                        aria-label={`Rimuovi ${move.name} dallo slot ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
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
                    <div
                      key={`${index}-${candidate.englishName}`}
                      data-testid={`move-result-${index + 1}-${candidate.englishName}`}
                      className="flex flex-wrap items-center gap-2 px-3 py-2 border-b last:border-b-0 border-gray-100"
                    >
                      <button type="button" onClick={() => onSelectMove(index, candidate)}
                        aria-label={`Assegna ${candidate.name} allo slot ${index + 1}`}
                        className="flex-1 min-w-0 text-left p-1 rounded hover:bg-gray-50">
                          <p className="font-lato text-sm text-[#2C3E50] break-words">{candidate.name}</p>
                          <MoveType type={candidate.type} />
                          <p className="font-courier text-[10px] text-gray-400">
                            {getDamageClassLabel(candidate.damageClass)}
                          </p>
                          <MovePower power={candidate.power} />
                      <span className="font-courier text-xs text-gray-400 flex-shrink-0">
                        {candidate.tmNumber ? ` · MT${candidate.tmNumber}` : candidate.level != null ? ` · Lv. ${candidate.level}` : ""}
                      </span>
                      </button>
                      <MoveEffectsButton move={candidate} onShow={onShowEffects} />
                    </div>
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
  const { pokemonId } = useParams();
  const { user } = useAuth();
  // Evolution and direct navigation must not reuse the previous Pokémon's drafts.
  return <PokemonDetailEditor key={`${user?.id}:${pokemonId}`} />;
}

function PokemonDetailEditor() {
  const { pokemonId } = useParams();
  return <PokemonDetail key={pokemonId} />;
}

function PokemonDetail() {
  const [pokemon, setPokemon] = useState(null);
  const [species, setSpecies] = useState(null);
  const [levelMoves, setLevelMoves] = useState([]);
  const [tmMoves, setTmMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");
  const [movesSubTab, setMovesSubTab] = useState("level");
  const [dataSource, setDataSource] = useState(null);
  const [userPokemonData, setUserPokemonData] = useState(null);
  const [level, setLevel] = useState("");
  const [nickname, setNickname] = useState("");
  const [items, setItems] = useState([]);
  const [heldItem, setHeldItem] = useState(null);
  const [ability, setAbility] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [isItemMenuOpen, setIsItemMenuOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [movesLoading, setMovesLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [effectsMove, setEffectsMove] = useState(null);
  const initialPokemon = useRef(null);

  // NUOVO: esattamente 4 slot
  const [learnedMoves, setLearnedMoves] = useState([null, null, null, null]);
  const [moveSearches, setMoveSearches] = useState({});

  const { pokemonId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const resourceKey = `pokemon:${user?.id}:${pokemonId}`;
  const autoSave = useAutoSave({
    resourceKey,
    enabled: Boolean(userPokemonData?.id && initialPokemon.current),
    initialValue: initialPokemon.current,
    value: {
      nickname: nickname.trim() || null, notes,
      level: level === "" ? null : /^\d+$/.test(level) && Number.isFinite(Number(level)) ? Number(level) : level,
      held_item: heldItem, ability: ability || null, learned_moves: learnedMoves,
    },
    validate: (value) => {
      if (value.level !== null && (!Number.isInteger(value.level) || value.level < 1 || value.level > 100)) return "Il livello deve essere un numero intero tra 1 e 100.";
      const selected = value.learned_moves.filter(Boolean);
      if (new Set(selected.map(move => move.englishName)).size !== selected.length) return "Non puoi inserire la stessa mossa più volte.";
      return "";
    },
    save: (value, previous) => api.put(`/pokemon/my/${pokemonId}`, changedFields(value, previous),
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }),
    onSaved: (_, snapshot) => setUserPokemonData(current => ({ ...current, ...snapshot })),
  });

  useEffect(() => {
    fetchPokemonData();
    fetchUserPokemonData();
    fetchItems();
  }, [pokemonId, token]);

  const fetchItems = async () => {
    try {
      const cachedItems = sessionStorage.getItem("pokemon-items-complete-v2");
      if (cachedItems) {
        setItems(JSON.parse(cachedItems));
        return;
      }

      // L'attributo 5 di PokéAPI contiene gli strumenti assegnabili.
      const response = await axios.get("https://pokeapi.co/api/v2/item?limit=3000");
      const itemResources = response.data.results || [];
      const basicItems = itemResources.map(resource => ({
        name: resource.name,
        displayName: resource.name.replaceAll("-", " "),
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${resource.name}.png`,
        url: resource.url,
        translated: false
      }));
      setItems(basicItems);
      setItemsLoading(false);
      sessionStorage.setItem("pokemon-items-complete-v2", JSON.stringify(basicItems));

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

  // Mantiene i 4 slot e carica ciò che è salvato nel backend.
  const normalizeLearnedMoves = (moves) => {
    const result = Array.isArray(moves) ? moves.slice(0, 4) : [];
    while (result.length < 4) result.push(null);
    return result;
  };

  const fetchUserPokemonData = async () => {
    try {
      const pending = await recoverPendingSave(resourceKey);
      const response = await api.get(`/pokemon/my/${pokemonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserPokemonData(response.data);
      initialPokemon.current = {
        nickname: response.data.nickname || null, level: response.data.level ?? null,
        notes: response.data.notes || "", ability: response.data.ability || null,
        held_item: response.data.held_item || null, learned_moves: normalizeLearnedMoves(response.data.learned_moves),
      };
      const draft = { ...initialPokemon.current, ...pending };
      setNickname(draft.nickname || "");
      setNotes(draft.notes);
      setHeldItem(draft.held_item);
      setAbility(draft.ability || "");
      setItemSearch(draft.held_item?.display_name || "");
      setLevel(draft.level?.toString() || "");
      setLearnedMoves(draft.learned_moves);
    } catch (error) {
      console.log("Pokemon non assegnato all'utente o errore nel caricamento dati");
    }
  };

  const selectHeldItem = async (item) => {
    setHeldItem({ name: item.name, display_name: item.displayName, sprite: item.sprite });
    setItemSearch(item.displayName);
    setIsItemMenuOpen(false);
    if (item.translated) return;
    try {
      const { data } = await axios.get(`https://pokeapi.co/api/v2/item/${encodeURIComponent(item.name)}/`, { timeout: 10000 });
      const displayName = data.names?.find(entry => entry.language.name === "it")?.name
        || data.names?.find(entry => entry.language.name === "en")?.name || item.displayName;
      setHeldItem(current => current?.name === item.name ? { ...current, display_name: displayName, sprite: data.sprites?.default || current.sprite } : current);
      setItemSearch(current => current === item.displayName ? displayName : current);
    } catch { /* The selected catalog entry remains valid without translated details. */ }
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
          const moveData = await getMoveData(move.move.name);

          const italianName =
            moveData.names.find(n => n.language.name === "it")?.name ||
            moveData.name;

          let tmNumber = null;

          if (!isLevelUp && versionGroupName) {
            const versionMachine = moveData.machines.find(
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
            englishName: moveData.name,
            type: moveData.type.name,
            power: moveData.power,
            accuracy: moveData.accuracy,
            pp: moveData.pp,
            damageClass: moveData.damage_class.name,
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
            onClick={async () => { if (await autoSave.flush()) navigate("/my-pokemon"); }}
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
              <PokemonEvolution pokemonId={pokemonId} owned={Boolean(userPokemonData?.id)}
                disabled={autoSave.dirty} />
            </div>

            <div className="w-full min-w-0 text-center sm:text-left flex-1">
              <p className="font-courier text-gray-500 mb-1">
                #{pokemon.id.toString().padStart(3, "0")}
              </p>

              <div className="mb-3">
                <div className="flex flex-wrap items-end justify-center sm:justify-start gap-3">
                <h1
                  data-testid="pokemon-name"
                  className="font-cinzel text-3xl sm:text-4xl text-[#2C3E50] capitalize"
                >
                  {getItalianName()}
                </h1>
                {userPokemonData?.id && <label htmlFor="pokemon-nickname" className="w-full sm:w-52 text-left">
                  <span className="block font-courier text-xs text-gray-500 mb-1">Soprannome</span>
                  <Input id="pokemon-nickname" data-testid="pokemon-nickname" value={nickname} maxLength={50}
                    onChange={event => setNickname(event.target.value)} placeholder="Aggiungi un soprannome" />
                </label>}
                </div>
                {userPokemonData?.id && <AutoSaveStatus state={autoSave} testId="pokemon-autosave-status" className="mt-3 justify-center sm:justify-start" />}

                {userPokemonData?.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 justify-center sm:justify-start">
                    <div className="relative w-full sm:w-auto text-left">
                      <span className="block font-courier text-xs text-gray-400 mb-1">Strumento</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          data-testid="held-item-search"
                          value={itemSearch}
                          onChange={(event) => {
                            setItemSearch(event.target.value);
                            setIsItemMenuOpen(true);
                          }}
                          onFocus={() => setIsItemMenuOpen(true)}
                          onBlur={() => setTimeout(() => setIsItemMenuOpen(false), 150)}
                          placeholder={itemsLoading ? "Caricamento strumenti..." : "Cerca uno strumento..."}
                          disabled={itemsLoading}
                          autoComplete="off"
                          className="w-full sm:w-64 h-11 pl-9 pr-9 bg-white border-2 border-[#D4AF37]/30 rounded-lg text-sm font-lato outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10 disabled:bg-gray-50"
                        />
                        {(itemSearch || heldItem) && (
                          <button
                            type="button"
                            aria-label="Rimuovi strumento"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setItemSearch("");
                              setHeldItem(null);
                              setIsItemMenuOpen(true);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#C0392B]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isItemMenuOpen && !itemsLoading && (
                        <div className="absolute z-30 top-full left-0 mt-1 w-full sm:w-64 max-h-64 overflow-y-auto bg-white border border-[#D4AF37]/40 rounded-lg shadow-xl">
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setHeldItem(null);
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
                              onClick={() => selectHeldItem(item)}
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
                    <p className="w-full font-lato text-xs text-gray-500 text-left">{heldItem ? `Assegnato: ${heldItem.display_name}` : "Nessuno strumento assegnato"}</p>
                  </div>
                )}
              </div>

              {userPokemonData?.id && <div className="mb-3">
                <PokemonAbility pokemon={pokemon} selectedAbility={ability} onChange={setAbility} />
              </div>}

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

              <Button
                type="button"
                data-testid="open-calculator-btn"
                onClick={async () => {
                  if (await autoSave.flush()) navigate(`/calculator?pokemonId=${pokemon.id}`);
                }}
                className="mt-4 bg-[#2C3E50] hover:bg-[#8E44AD] text-white font-lato"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Apri nel Calcolatore
              </Button>

              <div className="flex gap-6 mt-4 justify-center sm:justify-start flex-wrap">
                <div>
                  <p className="font-courier text-xs text-gray-400">Altezza</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.height / 10).toFixed(1)} m</p>
                </div>

                <div>
                  <p className="font-courier text-xs text-gray-400">Peso</p>
                  <p className="font-lato text-[#2C3E50]">{(pokemon.weight / 10).toFixed(1)} kg</p>
                </div>

                {userPokemonData?.id && (
                  <div>
                    <label htmlFor="pokemon-level" className="block font-courier text-xs text-gray-400 mb-1">Livello</label>
                        <Input
                          id="pokemon-level"
                          data-testid="level-input"
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          inputMode="numeric"
                          placeholder="—"
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="w-20 h-11 text-sm text-center"
                        />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {userPokemonData?.id && <section className="mb-6 bg-white gold-border rounded-lg p-4 sm:p-6">
          <label htmlFor="pokemon-notes" className="block font-cinzel text-xl text-[#2C3E50] mb-2">Note</label>
          <p className="font-lato text-sm text-gray-500 mb-3">Appunti personali su questo Pokémon.</p>
          <Textarea id="pokemon-notes" data-testid="pokemon-notes" value={notes}
            onChange={(event) => setNotes(event.target.value)} maxLength={5000}
            placeholder="Scrivi qui le tue note..." className="min-h-32 resize-y" />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <span className="font-lato text-xs text-gray-400">{notes.length}/5000</span>
            <AutoSaveStatus state={autoSave} testId="notes-autosave-status" />
          </div>
        </section>}
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
                <LearnableMovesList moves={levelMoves} mode="level" onShowEffects={setEffectsMove} />
              ) : (
                <p className="text-center py-8 text-gray-500 font-lato">Nessuna mossa per livello trovata</p>
              )
            )}

            {!movesLoading && movesSubTab === "tm" && (
              tmMoves.length > 0 ? (
                <LearnableMovesList moves={tmMoves} mode="tm" onShowEffects={setEffectsMove} />
              ) : (
                <p className="text-center py-8 text-gray-500 font-lato">Nessuna mossa MT trovata</p>
              )
            )}
          </div>
        )}

        {activeTab === "learnedMoves" && (
          userPokemonData?.id ? (
            <LearnedMovesPanel
              learnedMoves={learnedMoves}
              moveSearches={moveSearches}
              setMoveSearches={setMoveSearches}
              onSelectMove={selectLearnedMove}
              onRemoveMove={removeLearnedMove}
              autoSave={autoSave}
              onShowEffects={setEffectsMove}
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
      <MoveEffectsDialog move={effectsMove} onClose={() => setEffectsMove(null)} versionGroup={dataSource?.name} />
    </div>
  );
}
