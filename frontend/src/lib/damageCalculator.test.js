import { applyPercentageModifier, calculateTotalModifier, getStatTier, getTierModifier } from "./damageCalculator";

describe("damageCalculator", () => {
  test.each([
    [0, 0], [64, 0], [65, 1], [94, 1], [95, 2], [129, 2], [130, 3],
  ])("classifica %s nel tier %s", (value, tier) => {
    expect(getStatTier(value)).toBe(tier);
  });

  test("usa i modificatori della legenda per attacchi e difese", () => {
    expect(getTierModifier(3, "attack")).toBe(15);
    expect(getTierModifier(3, "defense")).toBe(-20);
  });

  test("somma statistica, STAB e potenziamento", () => {
    expect(calculateTotalModifier({ value: 100, kind: "attack", stab: true, boost: 2 })).toEqual({
      tier: 2,
      statModifier: 10,
      stabModifier: 20,
      boostModifier: 50,
      total: 80,
    });
  });

  test("applica la percentuale al risultato e arrotonda per eccesso", () => {
    expect(applyPercentageModifier(10, 35)).toEqual({ exact: 13.5, rounded: 14 });
    expect(applyPercentageModifier(6, 20).exact).toBeCloseTo(7.2);
    expect(applyPercentageModifier(6, 20).rounded).toBe(8);
    expect(applyPercentageModifier(10, -20)).toEqual({ exact: 8, rounded: 8 });
  });
});
