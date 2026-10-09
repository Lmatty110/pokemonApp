export const CALCULATOR_STATS = [
  { key: "attack", label: "Attacco", kind: "attack" },
  { key: "special-attack", label: "Attacco Speciale", kind: "attack" },
  { key: "defense", label: "Difesa", kind: "defense" },
];

export const ATTACK_BOOSTS = {
  0: 0,
  1: 20,
  2: 50,
};

export const getStatTier = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;
  if (numericValue <= 64) return 0;
  if (numericValue <= 94) return 1;
  if (numericValue <= 129) return 2;
  return 3;
};

export const getTierModifier = (tier, kind) => {
  if (tier === null || tier === undefined) return null;
  const modifiers = kind === "defense" ? [10, 0, -10, -20] : [0, 5, 10, 15];
  return modifiers[tier] ?? null;
};

export const calculateTotalModifier = ({ value, kind, stab, boost }) => {
  const tier = getStatTier(value);
  const statModifier = getTierModifier(tier, kind);
  if (statModifier === null) return null;

  const stabModifier = stab ? 20 : 0;
  const boostModifier = ATTACK_BOOSTS[boost] ?? 0;

  return {
    tier,
    statModifier,
    stabModifier,
    boostModifier,
    total: statModifier + stabModifier + boostModifier,
  };
};

export const applyPercentageModifier = (value, percentage) => {
  if (value === "" || value === null || value === undefined) return null;
  const numericValue = Number(value);
  const numericPercentage = Number(percentage);
  if (!Number.isFinite(numericValue) || numericValue < 0 || !Number.isFinite(numericPercentage)) return null;

  const exact = numericValue * (1 + numericPercentage / 100);
  return { exact, rounded: Math.ceil(exact) };
};
