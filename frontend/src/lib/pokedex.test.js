import axios from "axios";
import { getPokemonDisplayName, loadPokedex } from "./pokedex";

jest.mock("axios");

test("regional forms and Rotom appliances have searchable names", () => {
  expect(getPokemonDisplayName("zigzagoon-galar")).toBe("Zigzagoon di Galar");
  expect(getPokemonDisplayName("rotom-wash")).toBe("Rotom Lavatrice");
  expect(getPokemonDisplayName("mr-mime", "Mr. Mime", "mr-mime")).toBe("Mr. Mime");
  expect(getPokemonDisplayName("mr-mime-galar", "Mr. Mime", "mr-mime")).toBe("Mr. Mime di Galar");
  expect(getPokemonDisplayName("darmanitan-galar-standard")).toBe("Darmanitan di Galar (Standard)");
});

test("Pokédex catalog includes non-default varieties returned by PokéAPI", async () => {
  localStorage.clear();
  axios.post.mockResolvedValue({ data: { data: { pokemon: [
    { id: 479, name: "rotom", pokemontypes: [{ slot: 1, type: { name: "electric" } }] },
    { id: 10009, name: "rotom-wash", pokemontypes: [{ slot: 1, type: { name: "electric" } }, { slot: 2, type: { name: "water" } }] },
    { id: 10172, name: "zigzagoon-galar", pokemontypes: [{ slot: 1, type: { name: "dark" } }] },
  ] } } });
  const catalog = await loadPokedex();
  expect(axios.post.mock.calls[0][1].query).not.toContain("is_default");
  expect(catalog.map(pokemon => pokemon.name)).toEqual(["rotom", "rotom-wash", "zigzagoon-galar"]);
  expect(catalog[1].types).toEqual(["electric", "water"]);
});
