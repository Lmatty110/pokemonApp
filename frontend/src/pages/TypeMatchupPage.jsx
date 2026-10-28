import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, Crosshair, RotateCcw, Shield, Sparkles, Swords } from "lucide-react";
import TypeBadge from "../components/TypeBadge";
import { calculateTypeMatchups, POKEMON_TYPES, TYPE_COLORS, TYPE_LABELS } from "../lib/pokemonTypes";

const ResultGroup = ({ title, description, entries, tone }) => {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-800",
    safe: "border-emerald-200 bg-emerald-50 text-emerald-800",
    immune: "border-slate-300 bg-slate-100 text-slate-800",
    neutral: "border-gray-200 bg-white text-gray-700",
  };
  return (
    <section className={`min-w-0 rounded-xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-cinzel text-sm">{title}</h3>
          <p className="mt-1 font-lato text-xs opacity-70">{description}</p>
        </div>
        <span className="rounded-full bg-black/5 px-2 py-1 font-courier text-xs">{entries.length}</span>
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">
        {entries.length
          ? entries.map(entry => <TypeBadge key={entry.type} type={entry.type} multiplier={entry.multiplier} />)
          : <span className="font-lato text-sm opacity-60">Nessun tipo</span>}
      </div>
    </section>
  );
};

export default function TypeMatchupPage() {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState(["water"]);
  const result = useMemo(() => calculateTypeMatchups(selectedTypes), [selectedTypes]);

  const toggleType = type => {
    setSelectedTypes(current => {
      if (current.includes(type)) return current.length === 1 ? current : current.filter(value => value !== type);
      if (current.length < 2) return [...current, type];
      return [current[0], type];
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F5F7]">
      <header className="bg-[#172433] shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
          <button type="button" onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-2 text-white transition-colors hover:text-[#7EF9FF]">
            <ArrowLeft className="h-5 w-5" /> <span className="truncate font-lato">Torna alla Bacheca</span>
          </button>
          <div className="flex items-center gap-2 text-[#7EF9FF]"><Crosshair className="h-5 w-5" /><span className="hidden font-cinzel text-sm text-white sm:inline">Analisi tipi</span></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="font-courier text-[10px] uppercase tracking-[.18em] text-[#8E44AD] sm:text-xs sm:tracking-[.25em]">Battle intelligence system</p>
          <h1 className="mt-2 font-cinzel text-2xl text-[#2C3E50] sm:text-4xl">Calcolatore Debolezze</h1>
          <p className="mx-auto mt-3 max-w-2xl font-lato text-gray-600">Seleziona uno o due tipi per analizzare difesa, resistenze, immunità e copertura offensiva.</p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#D4AF37]/60 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-[#172433] via-[#283C4F] to-[#172433] px-4 py-4 text-white sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-cinzel text-lg">Configurazione Pokémon</h2>
                <p className="mt-1 font-lato text-xs text-white/65">Tocca un tipo per selezionarlo · massimo due</p>
              </div>
              <button type="button" onClick={() => setSelectedTypes(["water"])} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 font-lato text-xs hover:bg-white/10"><RotateCcw className="h-4 w-4" /> Ripristina</button>
            </div>
          </div>

          <div className="p-3 sm:p-7">
            <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 sm:grid-cols-6 lg:grid-cols-9">
              {POKEMON_TYPES.map(type => {
                const selected = selectedTypes.includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={selected}
                    onClick={() => toggleType(type)}
                    className={`relative flex min-h-14 min-w-0 items-center justify-center overflow-hidden rounded-lg border-2 px-1.5 text-center font-lato text-[11px] font-bold uppercase tracking-wide transition sm:px-2 sm:text-xs ${selected ? "scale-[1.03] border-[#172433] text-white shadow-lg" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}
                    style={selected ? { backgroundColor: TYPE_COLORS[type] } : undefined}
                  >
                    {TYPE_LABELS[type]}
                    {selected && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white shadow-[0_0_7px_white]" />}
                  </button>
                );
              })}
            </div>

            <div className="my-7 flex flex-col items-center justify-center gap-3">
              <p className="font-courier text-xs uppercase tracking-widest text-gray-400">Profilo selezionato</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {selectedTypes.map(type => <TypeBadge key={type} type={type} className="min-h-10 px-4 text-sm sm:px-5" />)}
              </div>
              <ArrowDown className="h-5 w-5 animate-bounce text-[#D4AF37]" />
            </div>

            {result && (
              <div className="grid gap-7 xl:grid-cols-2">
                <article className="min-w-0 rounded-2xl border-2 border-[#2C3E50]/15 bg-[#F8FAFC] p-3 sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C3E50] text-[#D4AF37]"><Shield className="h-6 w-6" /></span>
                    <div><h2 className="font-cinzel text-xl text-[#2C3E50]">In difesa</h2><p className="mt-1 font-lato text-sm text-gray-500">Come gli attacchi avversari colpiscono questo Pokémon.</p></div>
                  </div>
                  <div className="space-y-3">
                    <ResultGroup title="Debolezze" description="Attacchi superefficaci subiti" entries={result.defense.superEffective} tone="danger" />
                    <ResultGroup title="Resistenze" description="Attacchi resistiti dal Pokémon" entries={result.defense.resisted} tone="safe" />
                    <ResultGroup title="Immunità" description="Attacchi che non infliggono danno" entries={result.defense.immune} tone="immune" />
                    <ResultGroup title="Danno normale" description="Attacchi con efficacia ×1" entries={result.defense.neutral} tone="neutral" />
                  </div>
                </article>

                <article className="min-w-0 rounded-2xl border-2 border-[#8E44AD]/15 bg-[#FCF9FF] p-3 sm:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8E44AD] text-white"><Swords className="h-6 w-6" /></span>
                    <div><h2 className="font-cinzel text-xl text-[#2C3E50]">In attacco</h2><p className="mt-1 font-lato text-sm text-gray-500">{selectedTypes.length === 2 ? "Copertura usando il migliore dei due attacchi STAB." : "Efficacia degli attacchi dello stesso tipo."}</p></div>
                  </div>
                  <div className="space-y-3">
                    <ResultGroup title="Superefficace" description="Bersagli colpiti con efficacia ×2" entries={result.offense.superEffective} tone="danger" />
                    <ResultGroup title="Poco efficace" description="Bersagli che resistono agli attacchi" entries={result.offense.resisted} tone="safe" />
                    <ResultGroup title="Nessun effetto" description="Bersagli immuni agli attacchi" entries={result.offense.immune} tone="immune" />
                    <ResultGroup title="Danno normale" description="Bersagli colpiti con efficacia ×1" entries={result.offense.neutral} tone="neutral" />
                  </div>
                </article>
              </div>
            )}

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#FFF9E6] p-4 text-[#574A20]">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#B08B16]" />
              <p className="font-lato text-sm">I moltiplicatori dei doppi tipi vengono combinati: due debolezze producono <strong>×4</strong>, due resistenze <strong>×0,25</strong> e un'immunità prevale sempre.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

