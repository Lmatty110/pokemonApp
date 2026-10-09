import { cleanMoveText, describeMoveEffects, getDamageDice, getTypeLabel } from "./moves";

describe("move dice conversion", () => {
  test.each([
    [1, "2d4"], [40, "2d4"], [41, "3d4"], [60, "3d4"], [61, "4d4"], [80, "4d4"],
    [81, "3d8"], [100, "3d8"], [101, "4d8"], [120, "4d8"], [121, "5d8"], [140, "5d8"],
    [141, "6d10"], [250, "6d10"],
  ])("power %s produces %s", (power, dice) => expect(getDamageDice(power)).toBe(dice));
  test.each([null, undefined, 0, -1, NaN, Infinity, "40", 40.5])("unknown or invalid power %s has no dice", power => {
    expect(getDamageDice(power)).toBeNull();
  });
});

describe("move effects", () => {
  const base = {
    effect_chance: 10,
    flavor_text_entries: [
      { language: { name: "it" }, version_group: { name: "scarlet-violet" }, flavor_text: "Descrizione italiana\ncorretta." },
      { language: { name: "it" }, version_group: { name: "sword-shield" }, flavor_text: "Altra versione." },
    ],
    effect_entries: [{ language: { name: "en" }, effect: "Has a $effect_chance% chance to [burn]{mechanic:burn} the target." }],
    meta: { ailment: { name: "burn" }, ailment_chance: 10 },
  };
  test("prefers Italian text from the selected version, without losing the full effect", () => {
    expect(describeMoveEffects(base, "scarlet-violet")).toMatchObject({
      text: "Descrizione italiana corretta.", language: "it",
      detailedText: "Has a 10% chance to burn the target.", detailedLanguage: "en",
      secondary: ["Stato alterato: Scottatura (10%)."],
    });
  });
  test("falls back to available Italian text before English", () => {
    expect(describeMoveEffects(base, "unknown-version").text).toBe("Altra versione.");
  });
  test("English fallback is labelled and chance placeholders are resolved", () => {
    expect(describeMoveEffects({ ...base, flavor_text_entries: [] })).toMatchObject({
      text: "Has a 10% chance to burn the target.", language: "en", detailedText: "",
    });
  });
  test("missing effects are not presented as proof that no secondary effects exist", () => {
    const effects = describeMoveEffects({ meta: null });
    expect(effects.text).toBe("");
    expect(effects.secondary).toEqual([]);
    expect(effects.emptyMessage).toContain("non disponibili");
  });
  test("metadata describes stat changes, recoil, healing, multi-hit and chances", () => {
    const effects = describeMoveEffects({ meta: { ailment: { name: "none" }, flinch_chance: 30,
      stat_chance: 20, drain: -25, healing: 50, crit_rate: 1, min_hits: 2, max_hits: 5, min_turns: 2, max_turns: 2 },
    stat_changes: [{ stat: { name: "defense" }, change: -1 }] });
    expect(effects.secondary).toEqual([
      "Tentennamento: 30% di probabilità.", "Difesa: -1 livello (20%).",
      "Contraccolpo: perde PS pari al 25% del danno inflitto.", "Recupera il 50% dei PS massimi.",
      "Probabilità aumentata di brutto colpo (bonus: 1).", "Colpisce 2–5 volte.", "Durata: 2 turni.",
    ]);
  });
  test("zero chance is not silently turned into an invented probability", () => {
    expect(describeMoveEffects({ meta: { ailment: { name: "paralysis" }, ailment_chance: 0, drain: 50 } }).secondary)
      .toEqual(["Stato alterato: Paralisi.", "Assorbe PS pari al 50% del danno inflitto."]);
  });
  test("plain descriptions remove API mechanic links without introducing HTML", () => {
    expect(cleanMoveText("A [move]{move:thunder} with [an effect](https://example.com).\fNext line.", null))
      .toBe("A move with an effect. Next line.");
    expect(cleanMoveText("$effect_chance%", null)).toBe("?%");
  });
  test("known types are translated and unknown types stay readable", () => {
    expect(getTypeLabel("fire")).toBe("Fuoco");
    expect(getTypeLabel("electric")).toBe("Elettro");
    expect(getTypeLabel("new-type")).toBe("new-type");
    expect(getTypeLabel(null)).toBe("Sconosciuto");
  });
});
