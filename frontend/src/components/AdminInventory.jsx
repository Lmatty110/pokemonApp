import { useEffect, useState } from "react";
import { Package, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function AdminInventory({ users, token, revision }) {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setItems([]);
    setDrafts({});
    setError(false);
    if (!userId) return;
    setLoading(true);
    api.get(`/admin/users/${userId}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => { if (active) setItems(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, token, revision, refresh]);

  const update = async (item, value) => {
    const quantity = Number(value);
    if (String(value).trim() === "" || !Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
      toast.error("Inserisci una quantità intera tra 0 e 999");
      return;
    }
    if (!quantity && !window.confirm(`Rimuovere ${item.display_name} dall'inventario?`)) return;
    setBusy(true);
    try {
      await api.patch(`/admin/users/${userId}/inventory/${encodeURIComponent(item.name)}`, { quantity },
        { headers: { Authorization: `Bearer ${token}` } });
      setItems(previous => quantity ? previous.map(entry => entry.id === item.id ? { ...entry, quantity } : entry) : previous.filter(entry => entry.id !== item.id));
      setDrafts(previous => ({ ...previous, [item.id]: String(quantity) }));
      toast.success(quantity ? "Quantità aggiornata" : "Strumento rimosso");
    } catch (err) { toast.error(err.response?.data?.detail || "Errore nell'aggiornamento"); }
    finally { setBusy(false); }
  };

  return <section className="bg-white gold-border p-6 rounded-sm shadow-md mt-8">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
      <div><h2 className="font-cinzel text-xl text-[#2C3E50]">Inventario allenatore</h2>
        <p className="font-lato text-sm text-gray-500">Gestisci tutti gli strumenti e le quantità possedute.</p></div>
      <select aria-label="Allenatore di cui gestire l'inventario" value={userId} disabled={busy}
        onChange={event => setUserId(event.target.value)} className="border rounded-md p-2 max-w-full">
        <option value="">Scegli allenatore</option>
        {users.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
      </select>
    </div>
    {!userId ? <p>Scegli un allenatore per vedere gli strumenti.</p> : loading ? <p role="status">Caricamento inventario...</p> : error ?
      <div role="alert">Impossibile caricare l'inventario. <Button onClick={() => setRefresh(value => value + 1)}>Riprova</Button></div> : <>
        <p className="text-sm text-gray-500 mb-4">{items.length} strumenti diversi · {items.reduce((sum, item) => sum + item.quantity, 0)} oggetti totali</p>
        {!items.length && <p className="py-6 text-center text-gray-500">Questo allenatore non possiede strumenti.</p>}
        <div className="space-y-3">{items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 border rounded-lg p-3">
          {item.sprite ? <img src={item.sprite} alt="" className="w-10 h-10 object-contain" /> : <Package className="w-10 h-10 text-gray-400" />}
          <span className="flex-1 min-w-32 capitalize">{item.display_name} <strong className="text-[#8E44AD]">×{item.quantity}</strong></span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label={`Diminuisci ${item.display_name}`} disabled={busy} onClick={() => update(item, item.quantity - 1)}><Minus className="w-4 h-4" /></Button>
            <Input type="number" min="0" max="999" step="1" aria-label={`Quantità di ${item.display_name}`} value={drafts[item.id] ?? item.quantity} disabled={busy} onChange={event => setDrafts(previous => ({ ...previous, [item.id]: event.target.value }))} className="w-20" />
            <Button variant="outline" size="icon" aria-label={`Aumenta ${item.display_name}`} disabled={busy || item.quantity >= 999} onClick={() => update(item, item.quantity + 1)}><Plus className="w-4 h-4" /></Button>
            <Button variant="outline" disabled={busy} onClick={() => update(item, drafts[item.id] ?? item.quantity)}>Salva</Button>
            <Button variant="ghost" size="icon" className="text-red-600" aria-label={`Rimuovi ${item.display_name}`} disabled={busy} onClick={() => update(item, 0)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>)}</div>
      </>}
  </section>;
}
