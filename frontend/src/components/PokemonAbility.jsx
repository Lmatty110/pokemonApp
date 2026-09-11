import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import api from "../api";
import { Button } from "./ui/button";

const detailsCache = new Map();

export default function PokemonAbility({ pokemon, savedAbility, token, onSaved, onBusyChange }) {
  const [selected, setSelected] = useState(savedAbility || "");
  const [details, setDetails] = useState({});
  const [saving, setSaving] = useState(false);
  const abilities = pokemon.abilities || [];

  useEffect(() => { setSelected(savedAbility || ""); }, [savedAbility]);
  useEffect(() => {
    onBusyChange(saving || selected !== (savedAbility || ""));
  }, [saving, selected, savedAbility, onBusyChange]);

  useEffect(() => {
    let active = true;
    Promise.all((pokemon.abilities || []).map(async ({ ability }) => {
      try {
        let data = detailsCache.get(ability.name);
        if (!data) {
          data = (await axios.get(`https://pokeapi.co/api/v2/ability/${encodeURIComponent(ability.name)}/`, { timeout: 10000 })).data;
          detailsCache.set(ability.name, data);
        }
        const names = data.names || [];
        const texts = data.flavor_text_entries || [];
        const text = [...texts].reverse().find(entry => entry.language.name === "it")
          || [...texts].reverse().find(entry => entry.language.name === "en");
        return [ability.name, {
          name: names.find(entry => entry.language.name === "it")?.name
            || names.find(entry => entry.language.name === "en")?.name || ability.name,
          description: text?.flavor_text?.replace(/\s+/g, " ") || ""
        }];
      } catch {
        return [ability.name, { name: ability.name.replaceAll("-", " "), description: "" }];
      }
    })).then(entries => { if (active) setDetails(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [pokemon]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/pokemon/my/${pokemon.id}`, { ability: selected || null },
        { headers: { Authorization: `Bearer ${token}` } });
      onSaved(data);
      toast.success(selected ? "Abilità assegnata!" : "Abilità rimossa!");
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Errore nel salvataggio dell'abilità");
    } finally { setSaving(false); }
  };

  return <div className="mt-3 text-left">
    <label htmlFor="pokemon-ability" className="block font-courier text-xs text-gray-400 mb-1">Abilità</label>
    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
      <select id="pokemon-ability" data-testid="ability-select" value={selected}
        onChange={event => setSelected(event.target.value)} disabled={saving}
        className="h-10 max-w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-lato text-[#2C3E50]">
        <option value="">Nessuna abilità</option>
        {savedAbility && !abilities.some(entry => entry.ability.name === savedAbility) &&
          <option value={savedAbility} disabled>{savedAbility} (non disponibile)</option>}
        {abilities.map(({ ability, is_hidden, slot }) => <option key={slot} value={ability.name}>
          {details[ability.name]?.name || ability.name.replaceAll("-", " ")}{is_hidden ? " (nascosta)" : ""}
        </option>)}
      </select>
      <Button size="sm" data-testid="save-ability" onClick={save}
        disabled={saving || selected === (savedAbility || "")}
        className="h-10 bg-[#D4AF37] hover:bg-[#b8941f] text-white">
        {saving ? "Salvataggio..." : selected ? "Assegna" : "Rimuovi"}
      </Button>
    </div>
    {details[selected]?.description && <p className="mt-2 text-sm font-lato text-gray-500">{details[selected].description}</p>}
  </div>;
}
