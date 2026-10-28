import { calculateTypeMatchups, getAttackMultiplier } from "./pokemonTypes";

describe("pokemonTypes", () => {
  test("calcola debolezze, resistenze e immunità di un tipo singolo", () => {
    const result = calculateTypeMatchups(["water"]);
    expect(result.defense.superEffective.map(entry => entry.type)).toEqual(expect.arrayContaining(["electric", "grass"]));
    expect(result.defense.resisted.map(entry => entry.type)).toEqual(expect.arrayContaining(["fire", "water", "ice", "steel"]));
    expect(result.offense.superEffective.map(entry => entry.type)).toEqual(expect.arrayContaining(["fire", "ground", "rock"]));
  });

  test("combina correttamente un doppio tipo", () => {
    expect(getAttackMultiplier("water", ["rock", "ground"])).toBe(4);
    expect(getAttackMultiplier("electric", ["rock", "ground"])).toBe(0);
    const result = calculateTypeMatchups(["rock", "ground"]);
    expect(result.defense.superEffective).toContainEqual({ type: "water", multiplier: 4 });
    expect(result.defense.immune).toContainEqual({ type: "electric", multiplier: 0 });
  });

  test("usa la migliore copertura STAB per il doppio tipo", () => {
    const result = calculateTypeMatchups(["rock", "ground"]);
    expect(result.offense.superEffective).toContainEqual({ type: "flying", multiplier: 2 });
    expect(result.offense.immune).toHaveLength(0);
  });
});

