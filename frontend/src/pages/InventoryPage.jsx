import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Backpack, Minus, Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/inventory").then(({ data }) => setInventory(data)).catch(() => toast.error("Impossibile caricare lo zaino")).finally(() => setLoading(false));
  }, []);

  const loadCatalog = async () => {
    setDialogOpen(true);
    if (catalog.length) return;
    setCatalogLoading(true);
    try {
      const cached = sessionStorage.getItem("pokemon-items-complete-v2");
      if (cached) { setCatalog(JSON.parse(cached)); return; }
      const { data } = await axios.get("https://pokeapi.co/api/v2/item?limit=3000");
      const completeCatalog = (data.results || []).map((item) => ({ name: item.name, displayName: item.name.replaceAll("-", " "), sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png` }));
      setCatalog(completeCatalog);
      sessionStorage.setItem("pokemon-items-complete-v2", JSON.stringify(completeCatalog));
    } catch { toast.error("Impossibile caricare il catalogo strumenti"); }
    finally { setCatalogLoading(false); }
  };

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("it");
    return catalog.filter((item) => !inventory.some((owned) => owned.name === item.name) && (!query || item.displayName.toLocaleLowerCase("it").includes(query) || item.name.includes(query))).slice(0, 60);
  }, [catalog, inventory, search]);

  const addItem = async (item) => {
    try {
      const { data } = await api.post("/inventory", { name: item.name, display_name: item.displayName, sprite: item.sprite });
      setInventory((current) => [...current, data].sort((a, b) => a.display_name.localeCompare(b.display_name, "it")));
      setDialogOpen(false); setSearch(""); toast.success(`${item.displayName} aggiunto allo zaino`);
    } catch { toast.error("Errore durante l'aggiunta"); }
  };

  const changeQuantity = async (item, delta) => {
    try {
      const { data } = await api.patch(`/inventory/${encodeURIComponent(item.name)}`, { delta });
      if (data.removed) setInventory((current) => current.filter((entry) => entry.name !== item.name));
      else setInventory((current) => current.map((entry) => entry.name === item.name ? data : entry));
    } catch { toast.error("Impossibile aggiornare la quantità"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="pokeball animate-pulse" /></div>;

  return <div className="min-h-screen bg-[#FDFBF7]">
    <header className="bg-[#2C3E50] shadow-lg"><div className="max-w-7xl mx-auto px-4 py-4"><button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-white hover:text-[#D4AF37]"><ArrowLeft className="w-5 h-5" /> Torna alla Bacheca</button></div></header>
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8"><div><h1 className="font-cinzel text-3xl text-[#2C3E50] flex items-center gap-3"><Backpack className="text-[#D4AF37]" /> Zaino</h1><p className="font-lato text-gray-500 mt-2">Tutti gli strumenti in tuo possesso</p></div>
        <Button onClick={loadCatalog} className="w-12 h-12 rounded-full bg-[#D4AF37] hover:bg-[#b89425] text-white p-0" aria-label="Aggiungi strumento"><Plus className="w-7 h-7" /></Button>
      </div>
      {inventory.length ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">{inventory.map((item) => <article key={item.id} className="aspect-square bg-white gold-border rounded-lg shadow-sm p-3 flex flex-col items-center justify-between">
        <h2 className="font-cinzel text-sm text-center text-[#2C3E50] line-clamp-2">{item.display_name}</h2>
        {item.sprite ? <img src={item.sprite} alt={item.display_name} className="w-20 h-20 object-contain image-rendering-pixelated" /> : <Package className="w-16 h-16 text-gray-300" />}
        <div className="flex items-center justify-center gap-3"><button onClick={() => changeQuantity(item, -1)} className="w-8 h-8 min-w-0 min-h-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><Minus className="w-4 h-4" /></button><span className="font-cinzel text-lg min-w-8 text-center">{item.quantity}</span><button onClick={() => changeQuantity(item, 1)} disabled={item.quantity >= 999} className="w-8 h-8 min-w-0 min-h-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><Plus className="w-4 h-4" /></button></div>
      </article>)}</div> : <div className="bg-white gold-border rounded-lg py-20 text-center"><Backpack className="w-16 h-16 mx-auto text-gray-200 mb-4" /><p className="font-cinzel text-xl text-[#2C3E50]">Il tuo zaino è vuoto</p><p className="font-lato text-gray-500 mt-2">Premi + per aggiungere il primo strumento.</p></div>}
    </main>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl bg-[#FDFBF7] border-[#D4AF37]"><DialogHeader><DialogTitle className="font-cinzel text-[#2C3E50]">Aggiungi uno strumento</DialogTitle><DialogDescription>Scegli dalla lista lo strumento da inserire nello zaino.</DialogDescription></DialogHeader>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca uno strumento..." className="pl-10" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto p-1">{catalogLoading ? <p className="col-span-full py-10 text-center">Caricamento strumenti...</p> : filteredCatalog.map((item) => <button key={item.name} onClick={() => addItem(item)} className="min-h-28 bg-white border border-gray-200 hover:border-[#D4AF37] rounded-lg p-3 flex flex-col items-center justify-center gap-2 text-center"><img src={item.sprite} alt="" className="w-12 h-12 shrink-0 object-contain" /><span className="block min-h-5 font-lato text-sm leading-tight capitalize text-[#2C3E50]">{item.displayName}</span></button>)}</div>
    </DialogContent></Dialog>
  </div>;
}
