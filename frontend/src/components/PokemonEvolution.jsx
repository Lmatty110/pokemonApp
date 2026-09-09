import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../api";
import { Button } from "./ui/button";

export default function PokemonEvolution({ pokemonId, owned, disabled }) {
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setOptions([]);
    setError(false);
    if (!owned) return;
    api.get(`/pokemon/my/${pokemonId}/evolutions`).then(({ data }) => {
      if (active) { setOptions(data); setTarget(String(data[0]?.pokemon_id || "")); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [pokemonId, owned, retry]);

  const evolve = async () => {
    const evolution = options.find(option => String(option.pokemon_id) === target);
    if (!evolution || !window.confirm(`Vuoi far evolvere il Pokémon in ${evolution.pokemon_name}? Livello, mosse salvate, soprannome e strumento saranno mantenuti.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/pokemon/my/${pokemonId}/evolve`, { pokemon_id: evolution.pokemon_id });
      toast.success(`Il tuo Pokémon si è evoluto in ${data.pokemon_name}!`);
      navigate(`/pokemon/${data.pokemon_id}`, { replace: true });
    } catch (err) { toast.error(err.response?.data?.detail || "Impossibile evolvere il Pokémon"); }
    finally { setBusy(false); }
  };
  if (error) return <Button variant="ghost" className="mt-3 text-xs" onClick={() => setRetry(value => value + 1)}>Riprova a caricare le evoluzioni</Button>;
  if (!options.length) return null;
  return <div className="mt-4 flex flex-col gap-2 max-w-48">
    {options.length > 1 && <select aria-label="Scegli evoluzione" className="border rounded p-2 capitalize" value={target} onChange={event => setTarget(event.target.value)} disabled={busy}>
      {options.map(option => <option key={option.pokemon_id} value={option.pokemon_id}>{option.pokemon_name}</option>)}
    </select>}
    <Button className="btn-academy" onClick={evolve} disabled={busy || disabled}>{busy ? "Evoluzione..." : "Evolvi"}</Button>
    {disabled && <p className="text-xs text-gray-500 text-center">Salva le modifiche prima di evolvere.</p>}
  </div>;
}
