import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Database, RotateCcw, Search, Wifi } from "lucide-react";
import PokedexIcon from "../components/PokedexIcon";
import TypeBadge from "../components/TypeBadge";
import { getPokemonDisplayName, loadPokedex } from "../lib/pokedex";
import { POKEMON_TYPES, TYPE_LABELS } from "../lib/pokemonTypes";

const PAGE_SIZE = 60;

export default function PokedexPage() {
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadPokedex()
      .then(data => { if (active) setPokemon(data); })
      .catch(() => { if (active) setError("Impossibile collegarsi all'archivio Pokédex. Riprova tra poco."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredPokemon = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("it");
    return pokemon.filter(entry => (
      (!term || entry.name.toLocaleLowerCase("it").includes(term) || getPokemonDisplayName(entry.name).toLocaleLowerCase("it").includes(term))
      && (selectedType === "all" || entry.types.includes(selectedType))
    ));
  }, [pokemon, search, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredPokemon.length / PAGE_SIZE));
  const visiblePokemon = filteredPokemon.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, selectedType]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const clearFilters = () => {
    setSearch("");
    setSelectedType("all");
  };

  const changePage = nextPage => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#111A24] text-white">
      <header className="border-b border-red-400/30 bg-[#1A2733] shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-white transition-colors hover:text-[#7EF9FF]">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-lato">Torna alla Bacheca</span>
          </button>
          <div className="flex items-center gap-2 font-courier text-xs uppercase tracking-widest text-[#7EF9FF]">
            <Wifi className="h-4 w-4" /> Archivio online
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-10">
        <section className="pokedex-shell overflow-hidden rounded-[2rem] border-4 border-[#711B22] bg-gradient-to-br from-[#DF3545] via-[#B82030] to-[#741621] p-3 shadow-2xl sm:p-6">
          <div className="mb-5 flex items-center gap-4 border-b border-white/20 pb-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#A9F8FF] shadow-[0_0_24px_rgba(126,249,255,.75)]">
              <PokedexIcon className="h-10 w-10 text-[#C72636]" />
            </div>
            <div className="min-w-0">
              <p className="font-courier text-[10px] uppercase tracking-[.28em] text-white/70">National database · Dex OS 2.0</p>
              <h1 className="font-cinzel text-2xl text-white sm:text-4xl">Pokédex</h1>
              <p className="mt-1 font-lato text-sm text-white/75">Elenco completo e classificazione dei tipi</p>
            </div>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <span className="h-3 w-3 rounded-full bg-[#F4D03F] shadow-[0_0_10px_#F4D03F]" />
              <span className="h-3 w-3 rounded-full bg-[#58D68D] shadow-[0_0_10px_#58D68D]" />
            </div>
          </div>

          <div className="rounded-2xl border-4 border-[#263746] bg-[#D8F5F1] p-3 text-[#17202A] shadow-inner sm:p-5">
            <div className="pokedex-screen relative overflow-hidden rounded-xl border-2 border-[#75B8B2] bg-[#E9FFFC] p-4 sm:p-6">
              <div className="relative z-10">
                <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
                  <label className="relative block">
                    <span className="sr-only">Cerca Pokémon per nome</span>
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#316C72]" />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      data-testid="pokedex-search"
                      placeholder="Cerca per nome..."
                      className="h-12 w-full rounded-lg border-2 border-[#75B8B2] bg-white/80 pl-11 pr-4 font-lato outline-none focus:border-[#C72636] focus:ring-2 focus:ring-[#C72636]/15"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Filtra per tipo</span>
                    <select
                      value={selectedType}
                      onChange={event => setSelectedType(event.target.value)}
                      data-testid="pokedex-type-filter"
                      className="h-12 w-full rounded-lg border-2 border-[#75B8B2] bg-white/80 px-3 font-lato outline-none focus:border-[#C72636]"
                    >
                      <option value="all">Tutti i tipi</option>
                      {POKEMON_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={clearFilters} className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#75B8B2] bg-[#D5F1ED] px-4 font-lato text-sm hover:border-[#C72636]">
                    <RotateCcw className="h-4 w-4" /> Azzera
                  </button>
                </div>

                <div className="my-5 flex flex-wrap items-center justify-between gap-2 border-y border-[#75B8B2]/60 py-3 font-courier text-xs uppercase tracking-wider text-[#316C72]">
                  <span className="flex items-center gap-2"><Database className="h-4 w-4" /> {filteredPokemon.length} Pokémon rilevati</span>
                  {!loading && <span>Pagina {page}/{totalPages}</span>}
                </div>

                {loading ? (
                  <div className="flex min-h-80 flex-col items-center justify-center text-[#316C72]">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#75B8B2] border-t-[#C72636]" />
                    <p className="mt-4 font-courier text-sm uppercase tracking-widest">Sincronizzazione archivio...</p>
                  </div>
                ) : error ? (
                  <div className="flex min-h-80 items-center justify-center text-center font-lato text-[#8B1E2B]">{error}</div>
                ) : visiblePokemon.length ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {visiblePokemon.map(entry => (
                      <article key={entry.id} className="group flex min-h-16 items-center gap-3 rounded-lg border border-[#75B8B2]/70 bg-white/75 px-3 py-2 transition hover:-translate-y-0.5 hover:border-[#C72636] hover:bg-white hover:shadow-md">
                        <span className="w-14 shrink-0 font-courier text-xs text-[#56858A]">#{String(entry.id).padStart(4, "0")}</span>
                        <h2 className="min-w-0 flex-1 truncate font-cinzel text-sm capitalize text-[#17202A]">{getPokemonDisplayName(entry.name)}</h2>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {entry.types.map(type => <TypeBadge key={type} type={type} className="px-2 text-[10px]" />)}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-80 flex-col items-center justify-center text-center">
                    <Search className="h-10 w-10 text-[#75B8B2]" />
                    <p className="mt-3 font-cinzel text-lg">Nessun Pokémon trovato</p>
                    <button type="button" onClick={clearFilters} className="mt-3 font-lato text-sm text-[#A51F2C] underline">Azzera i filtri</button>
                  </div>
                )}

                {!loading && !error && totalPages > 1 && (
                  <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginazione Pokédex">
                    <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className="flex items-center gap-1 rounded-lg border-2 border-[#75B8B2] bg-white px-3 py-2 font-lato text-sm disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4" /> Precedente
                    </button>
                    <span className="font-courier text-sm">{page} / {totalPages}</span>
                    <button type="button" disabled={page === totalPages} onClick={() => changePage(page + 1)} className="flex items-center gap-1 rounded-lg border-2 border-[#75B8B2] bg-white px-3 py-2 font-lato text-sm disabled:opacity-40">
                      Successiva <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

