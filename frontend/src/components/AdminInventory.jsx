import { useEffect, useState } from "react";
import { Package, Plus, Minus, Trash2 } from "lucide-react";
import api from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import useAutoSave from "../hooks/useAutoSave";
import AutoSaveStatus from "./AutoSaveStatus";
import { recoverPendingSaves } from "../lib/autoSave";

function InventoryRow({ item, userId, token, pendingQuantity, onSaved, onRemoved }) {
  const [quantity, setQuantity] = useState(String(pendingQuantity ?? item.quantity));
  const [removing, setRemoving] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const number = /^\d+$/.test(quantity) && Number.isFinite(Number(quantity)) ? Number(quantity) : quantity;
  const autoSave = useAutoSave({
    resourceKey: `admin-inventory:${userId}:${item.name}`,
    enabled: true, initialValue: { quantity: item.quantity }, value: { quantity: number },
    validate: value => !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 999
      ? "Inserisci una quantità da 1 a 999. Usa il cestino per rimuovere lo strumento." : "",
    save: value => api.patch(`/admin/users/${userId}/inventory/${encodeURIComponent(item.name)}`, value,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }),
    onSaved: (_, value) => onSaved(item.id, value.quantity),
  });

  const remove = async () => {
    if (!window.confirm(`Rimuovere ${item.display_name} dall'inventario?`)) return;
    setRemoving(true);
    setDeletionError("");
    autoSave.discard();
    await autoSave.flush();
    try {
      await api.patch(`/admin/users/${userId}/inventory/${encodeURIComponent(item.name)}`, { quantity: 0 },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
      onRemoved(item.id);
    } catch { setDeletionError("Impossibile rimuovere lo strumento. Riprova."); setRemoving(false); }
  };

  return <div className="flex flex-wrap items-center gap-3 border rounded-lg p-3">
    {item.sprite ? <img src={item.sprite} alt="" className="w-10 h-10 object-contain" /> : <Package className="w-10 h-10 text-gray-400" />}
    <span className="flex-1 min-w-32 capitalize">{item.display_name} <strong className="text-[#8E44AD]">×{item.quantity}</strong></span>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label={`Diminuisci ${item.display_name}`} disabled={removing || !Number.isInteger(number) || number < 1 || number > 999}
        onClick={() => Number.isInteger(number) && number > 1 ? setQuantity(String(number - 1)) : remove()}><Minus className="w-4 h-4" /></Button>
      <Input type="number" min="1" max="999" step="1" inputMode="numeric" aria-label={`Quantità di ${item.display_name}`}
        value={quantity} disabled={removing} onChange={event => setQuantity(event.target.value)} className="w-20" />
      <Button variant="outline" size="icon" aria-label={`Aumenta ${item.display_name}`} disabled={removing || !Number.isInteger(number) || number < 1 || number >= 999}
        onClick={() => setQuantity(String((Number.isInteger(number) && number >= 1 ? number : item.quantity) + 1))}><Plus className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="text-red-600" aria-label={`Rimuovi ${item.display_name}`} disabled={removing} onClick={remove}><Trash2 className="w-4 h-4" /></Button>
    </div>
    {removing ? <p role="status" className="w-full text-xs text-gray-500">Rimozione in corso...</p>
      : <AutoSaveStatus state={autoSave} className="w-full" testId={`inventory-autosave-${item.name}`} />}
    {deletionError && <p role="alert" className="w-full text-xs text-red-600">{deletionError}</p>}
  </div>;
}

export default function AdminInventory({ users, token, revision }) {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState([]);
  const [pendingQuantities, setPendingQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setItems([]);
    setPendingQuantities({});
    setError(false);
    if (!userId) return;
    setLoading(true);
    recoverPendingSaves(`admin-inventory:${userId}:`)
      .then(async pending => ({ pending, data: (await api.get(`/admin/users/${userId}/inventory`, { headers: { Authorization: `Bearer ${token}` } })).data }))
      .then(({ data, pending }) => { if (active) { setItems(data); setPendingQuantities(pending); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, token, revision, refresh]);

  return <section className="bg-white gold-border p-6 rounded-sm shadow-md mt-8">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
      <div><h2 className="font-cinzel text-xl text-[#2C3E50]">Inventario allenatore</h2>
        <p className="font-lato text-sm text-gray-500">Gestisci tutti gli strumenti e le quantità possedute.</p></div>
      <select aria-label="Allenatore di cui gestire l'inventario" value={userId}
        onChange={event => setUserId(event.target.value)} className="border rounded-md p-2 max-w-full">
        <option value="">Scegli allenatore</option>
        {users.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
      </select>
    </div>
    {!userId ? <p>Scegli un allenatore per vedere gli strumenti.</p> : loading ? <p role="status">Caricamento inventario...</p> : error ?
      <div role="alert">Impossibile caricare l'inventario. <Button onClick={() => setRefresh(value => value + 1)}>Riprova</Button></div> : <>
        <p className="text-sm text-gray-500 mb-4">{items.length} strumenti diversi · {items.reduce((sum, item) => sum + item.quantity, 0)} oggetti totali</p>
        {!items.length && <p className="py-6 text-center text-gray-500">Questo allenatore non possiede strumenti.</p>}
        <div className="space-y-3">{items.map(item => <InventoryRow key={`${userId}:${item.id}`} item={item} userId={userId} token={token}
          pendingQuantity={pendingQuantities[`admin-inventory:${userId}:${item.name}`]?.quantity}
          onSaved={(id, quantity) => setItems(previous => previous.map(entry => entry.id === id ? { ...entry, quantity } : entry))}
          onRemoved={id => setItems(previous => previous.filter(entry => entry.id !== id))} />)}</div>
      </>}
  </section>;
}
