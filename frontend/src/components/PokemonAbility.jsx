import { useEffect, useState } from "react";
import axios from "axios";

const detailsCache = new Map();

export default function PokemonAbility({ pokemon, selectedAbility, onChange }) {
  const [details, setDetails] = useState({});
  const abilities = pokemon.abilities || [];


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

  return <div className="mt-3 text-left">
    <label htmlFor="pokemon-ability" className="block font-courier text-xs text-gray-400 mb-1">Abilità</label>
    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
      <select id="pokemon-ability" data-testid="ability-select" value={selectedAbility}
        onChange={event => onChange(event.target.value)}
        className="h-10 max-w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-lato text-[#2C3E50]">
        <option value="">Nessuna abilità</option>
        {selectedAbility && !abilities.some(entry => entry.ability.name === selectedAbility) &&
          <option value={selectedAbility} disabled>{selectedAbility} (non disponibile)</option>}
        {abilities.map(({ ability, is_hidden, slot }) => <option key={slot} value={ability.name}>
          {details[ability.name]?.name || ability.name.replaceAll("-", " ")}{is_hidden ? " (nascosta)" : ""}
        </option>)}
      </select>
    </div>
    {details[selectedAbility]?.description && <p className="mt-2 text-sm font-lato text-gray-500">{details[selectedAbility].description}</p>}
  </div>;
}
