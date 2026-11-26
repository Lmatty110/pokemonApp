import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../api";
import { Button } from "./ui/button";

export default function PokemonEvolution({ pokemonId, owned, currentAbility, disabled }) {
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [chosenAbility, setChosenAbility] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setOptions([]);
    setChosenAbility("");
    setError(false);
    if (!owned) return;
    api.get(`/pokemon/my/${pokemonId}/evolutions`).then(({ data }) => {
      if (active) { setOptions(data); setTarget(String(data[0]?.pokemon_id || "")); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [pokemonId, owned, currentAbility, retry]);

  const evolve = async () => {
    const evolution = options.find(option => String(option.pokemon_id) === target);
    if (!evolution) return;
    if (currentAbility && !evolution.suggested_ability && !chosenAbility) {
      toast.error("Scegli l'abilità del Pokémon evoluto");
      return;
    }
    if (!window.confirm(`Vuoi far evolvere il Pokémon in ${evolution.pokemon_name}? Livello, mosse salvate, soprannome e strumento saranno mantenuti.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/pokemon/my/${pokemonId}/evolve`, {
        pokemon_id: evolution.pokemon_id,
        ...(chosenAbility ? { ability: chosenAbility } : {}),
      });
      toast.success(`Il tuo Pokémon si è evoluto in ${data.pokemon_name}!`);
      navigate(`/pokemon/${data.pokemon_id}`, { replace: true });
    } catch (err) { toast.error(err.response?.data?.detail || "Impossibile evolvere il Pokémon"); }
    finally { setBusy(false); }
  };
  if (error) return <Button variant="ghost" className="mt-3 text-xs" onClick={() => setRetry(value => value + 1)}>Riprova a caricare le evoluzioni</Button>;
  if (!options.length) return null;
  const selected = options.find(option => String(option.pokemon_id) === target);
  return <div className="mt-4 flex flex-col gap-2 max-w-48">
    {options.length > 1 && <select aria-label="Scegli evoluzione" className="border rounded p-2 capitalize" value={target} onChange={event => { setTarget(event.target.value); setChosenAbility(""); }} disabled={busy}>
      {options.map(option => <option key={option.pokemon_id} value={option.pokemon_id}>{option.pokemon_name}</option>)}
    </select>}
    {currentAbility && selected?.suggested_ability && selected.suggested_ability !== currentAbility &&
      <p className="text-xs text-gray-600 text-center">Abilità: {currentAbility.replaceAll("-", " ")} → {selected.suggested_ability.replaceAll("-", " ")}</p>}
    {currentAbility && selected?.ability_options && !selected.suggested_ability && <>
      <p className="text-xs text-gray-600 text-center">Prima dell'evoluzione: {currentAbility.replaceAll("-", " ")}</p>
      <select aria-label="Scegli abilità dopo l'evoluzione" className="border rounded p-2" value={chosenAbility} onChange={event => setChosenAbility(event.target.value)} disabled={busy}>
        <option value="">Scegli abilità</option>
        {selected.ability_options.map(name => <option key={name} value={name}>{name.replaceAll("-", " ")}</option>)}
      </select>
    </>}
    <Button className="btn-academy" onClick={evolve} disabled={busy || disabled}>{busy ? "Evoluzione..." : "Evolvi"}</Button>
    {disabled && <p className="text-xs text-gray-500 text-center">Attendi il salvataggio automatico delle modifiche prima di evolvere.</p>}
  </div>;
}
