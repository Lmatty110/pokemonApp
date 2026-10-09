import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Calculator, Check, Shield, Sparkles, Swords, Zap } from "lucide-react";
import { toast } from "sonner";
import { ATTACK_BOOSTS, CALCULATOR_STATS, calculateTotalModifier, getStatTier, getTierModifier } from "../lib/damageCalculator";

const TIER_COLORS = ["#E74C3C", "#F39C12", "#3498DB", "#27AE60"];

const StatIcon = ({ statKey }) => {
  if (statKey === "defense") return <Shield className="w-5 h-5" />;
  if (statKey === "special-attack") return <Zap className="w-5 h-5" />;
  return <Swords className="w-5 h-5" />;
};

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${value}%`;

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pokemonId = searchParams.get("pokemonId");
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(Boolean(pokemonId));
  const [values, setValues] = useState({ attack: "", "special-attack": "", defense: "" });
  const [selectedStat, setSelectedStat] = useState("");
  const [stab, setStab] = useState(false);
  const [boost, setBoost] = useState(0);

  useEffect(() => {
    if (!pokemonId) return;

    let active = true;
    const loadPokemon = async () => {
      try {
        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonId)}`);
        const nextValues = { attack: "", "special-attack": "", defense: "" };
        data.stats.forEach(({ base_stat: baseStat, stat }) => {
          if (stat.name in nextValues) nextValues[stat.name] = String(baseStat);
        });

        let displayName = data.name;
        try {
          const speciesResponse = await axios.get(data.species.url);
          displayName = speciesResponse.data.names?.find(entry => entry.language.name === "it")?.name || data.name;
        } catch {
          // Il nome inglese è sufficiente se il dato della specie non è disponibile.
        }

        if (active) {
          setPokemon({
            id: data.id,
            name: displayName,
            sprite: data.sprites.other?.["official-artwork"]?.front_default || data.sprites.front_default,
          });
          setValues(nextValues);
        }
      } catch (error) {
        if (active) toast.error("Impossibile precaricare le statistiche del Pokémon");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPokemon();
    return () => { active = false; };
  }, [pokemonId]);

  const selectedOption = CALCULATOR_STATS.find(option => option.key === selectedStat);
  const result = useMemo(() => {
    if (!selectedOption) return null;
    return calculateTotalModifier({
      value: values[selectedOption.key],
      kind: selectedOption.kind,
      stab,
      boost,
    });
  }, [boost, selectedOption, stab, values]);

  const updateValue = (key, value) => {
    if (value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 255)) {
      setValues(current => ({ ...current, [key]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="bg-[#2C3E50] shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(pokemonId ? `/pokemon/${pokemonId}` : "/dashboard")}
            className="flex items-center gap-2 text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-lato">{pokemonId ? "Torna al Pokémon" : "Torna alla Bacheca"}</span>
          </button>
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Calculator className="w-5 h-5" />
            <span className="hidden sm:inline font-cinzel text-sm text-white">Calcolatore</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-center gap-5">
          {pokemon?.sprite && (
            <div className="w-28 h-28 shrink-0 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <img src={pokemon.sprite} alt={pokemon.name} className="w-24 h-24 object-contain" />
            </div>
          )}
          <div>
            <p className="font-courier text-xs uppercase tracking-widest text-[#8E44AD] mb-2">Accademia Pokémon</p>
            <h1 className="font-cinzel text-3xl sm:text-4xl text-[#2C3E50]">Calcolatore</h1>
            <p className="font-lato text-gray-600 mt-2">
              {pokemon ? `Statistiche precompilate per ${pokemon.name}. Scegli quella da usare per il colpo.` : "Inserisci le statistiche del Pokémon e scegli quella da usare per il colpo."}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="bg-white gold-border rounded-lg p-10 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <p className="font-lato text-gray-500 mt-4">Caricamento statistiche...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6 items-start">
            <div className="space-y-6">
              <section className="bg-white gold-border rounded-lg p-5 sm:p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-cinzel text-xl text-[#2C3E50]">1. Statistica del colpo</h2>
                  <p className="font-lato text-sm text-gray-500 mt-1">Il valore determina automaticamente il Tier e il modificatore della legenda.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {CALCULATOR_STATS.map(option => {
                    const tier = getStatTier(values[option.key]);
                    const modifier = getTierModifier(tier, option.kind);
                    const selected = selectedStat === option.key;
                    return (
                      <div key={option.key} className={`relative rounded-lg border-2 p-4 transition-colors ${selected ? "border-[#D4AF37] bg-[#FFF9E6]" : "border-gray-200 bg-white"}`}>
                        <label htmlFor={`stat-${option.key}`} className="flex items-center gap-2 font-cinzel text-sm text-[#2C3E50]">
                          <span className="text-[#8E44AD]"><StatIcon statKey={option.key} /></span>
                          {option.label}
                        </label>
                        <input
                          id={`stat-${option.key}`}
                          data-testid={`calculator-${option.key}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="255"
                          value={values[option.key]}
                          onChange={event => updateValue(option.key, event.target.value)}
                          placeholder="Valore"
                          className="mt-3 w-full h-11 px-3 rounded-lg border border-gray-300 font-courier outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/10"
                        />
                        <div className="h-9 mt-3 flex items-center justify-between gap-2">
                          {tier === null ? (
                            <span className="font-lato text-xs text-gray-400">Inserisci un valore</span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-2 font-lato text-xs text-gray-600">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-bold" style={{ backgroundColor: TIER_COLORS[tier] }}>{tier}</span>
                                Tier {tier}
                              </span>
                              <span className="font-courier text-sm font-bold text-[#8E44AD]">{formatPercent(modifier)}</span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={tier === null}
                          onClick={() => setSelectedStat(option.key)}
                          className={`mt-3 w-full min-h-11 rounded-lg flex items-center justify-center gap-2 font-lato text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? "bg-[#2C3E50] text-white" : "bg-gray-100 text-[#2C3E50] hover:bg-[#D4AF37]/20"}`}
                        >
                          {selected && <Check className="w-4 h-4" />}
                          {selected ? "Selezionata" : "Usa questa"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white gold-border rounded-lg p-5 sm:p-6 shadow-sm">
                <h2 className="font-cinzel text-xl text-[#2C3E50] mb-5">2. Bonus del colpo</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="font-lato text-sm font-bold text-[#2C3E50] mb-3">Bonus STAB</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[false, true].map(value => (
                        <button key={String(value)} type="button" onClick={() => setStab(value)} className={`rounded-lg border-2 px-3 py-3 font-lato text-sm ${stab === value ? "border-[#D4AF37] bg-[#FFF9E6] text-[#2C3E50]" : "border-gray-200 text-gray-500"}`}>
                          {value ? "Sì · +20%" : "No · +0%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-lato text-sm font-bold text-[#2C3E50] mb-3">Livello di Attacco</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(ATTACK_BOOSTS).map(([level, modifier]) => (
                        <button key={level} type="button" onClick={() => setBoost(Number(level))} className={`rounded-lg border-2 px-2 py-3 font-lato text-sm ${boost === Number(level) ? "border-[#8E44AD] bg-[#8E44AD]/10 text-[#2C3E50]" : "border-gray-200 text-gray-500"}`}>
                          <span className="block font-bold">+{level}</span>
                          <span className="block text-xs mt-1">+{modifier}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-6 bg-[#2C3E50] text-white rounded-lg p-6 shadow-xl border border-[#D4AF37]">
              <div className="flex items-center gap-2 text-[#D4AF37] mb-1">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-cinzel text-xl text-white">Risultato</h2>
              </div>
              {!result ? (
                <p className="font-lato text-sm text-white/70 mt-5">Compila e seleziona una statistica per visualizzare il modificatore totale.</p>
              ) : (
                <div className="mt-5">
                  <p className="font-lato text-sm text-white/70 mb-5">Colpo basato su <strong className="text-white">{selectedOption.label}</strong>, Tier {result.tier}</p>
                  <dl className="space-y-3 font-lato text-sm">
                    <div className="flex justify-between gap-4"><dt>Mod. statistica</dt><dd className="font-courier">{formatPercent(result.statModifier)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>STAB</dt><dd className="font-courier">{formatPercent(result.stabModifier)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Livello +{boost}</dt><dd className="font-courier">{formatPercent(result.boostModifier)}</dd></div>
                  </dl>
                  <div className="mt-5 pt-5 border-t border-white/20 text-center">
                    <p className="font-lato text-xs uppercase tracking-widest text-[#D4AF37]">Modificatore totale</p>
                    <p data-testid="calculator-total" className="font-cinzel text-5xl mt-2">{formatPercent(result.total)}</p>
                    <p className="font-lato text-xs text-white/60 mt-3">Somma di statistica, STAB e livello di Attacco</p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
