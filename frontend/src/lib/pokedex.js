import axios from "axios";
import { POKEMON_TYPES } from "./pokemonTypes";

const CACHE_KEY = "academy-pokedex-v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const GRAPHQL_URL = "https://graphql.pokeapi.co/v1beta2";

const normalizePokemon = pokemon => ({
  id: pokemon.id,
  name: pokemon.name,
  types: (pokemon.pokemontypes || []).sort((a, b) => a.slot - b.slot).map(entry => entry.type.name),
});

const loadFromGraphql = async () => {
  const query = `query AcademyPokedex {
    pokemon(where: {is_default: {_eq: true}}, order_by: {id: asc}) {
      id
      name
      pokemontypes(order_by: {slot: asc}) { slot type { name } }
    }
  }`;
  const { data } = await axios.post(GRAPHQL_URL, { query }, { timeout: 20000 });
  if (data.errors?.length || !Array.isArray(data.data?.pokemon)) throw new Error("Risposta GraphQL non valida");
  return data.data.pokemon.map(normalizePokemon);
};

// Ripiego REST: 19 richieste complessive, mai una richiesta per ciascun Pokémon.
const loadFromRest = async () => {
  const [listResponse, ...typeResponses] = await Promise.all([
    axios.get("https://pokeapi.co/api/v2/pokemon?limit=10000", { timeout: 20000 }),
    ...POKEMON_TYPES.map(type => axios.get(`https://pokeapi.co/api/v2/type/${type}`, { timeout: 20000 })),
  ]);
  const typesByPokemon = new Map();
  typeResponses.forEach((response, index) => {
    response.data.pokemon.forEach(({ pokemon, slot }) => {
      const current = typesByPokemon.get(pokemon.name) || [];
      current.push({ name: POKEMON_TYPES[index], slot });
      typesByPokemon.set(pokemon.name, current);
    });
  });

  return listResponse.data.results
    .map(resource => ({
      id: Number(resource.url.match(/\/pokemon\/(\d+)\/?$/)?.[1]),
      name: resource.name,
      types: (typesByPokemon.get(resource.name) || []).sort((a, b) => a.slot - b.slot).map(type => type.name),
    }))
    .filter(pokemon => Number.isFinite(pokemon.id) && pokemon.id < 10000 && pokemon.types.length);
};

export const getPokemonDisplayName = name => name
  .split("-")
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export const loadPokedex = async () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached?.savedAt > Date.now() - CACHE_DURATION && Array.isArray(cached.pokemon)) return cached.pokemon;
  } catch {
    // Una cache non valida viene semplicemente ignorata.
  }

  let pokemon;
  try {
    pokemon = await loadFromGraphql();
  } catch {
    pokemon = await loadFromRest();
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), pokemon }));
  } catch {
    // L'app resta utilizzabile anche se lo storage è pieno o disabilitato.
  }
  return pokemon;
};

