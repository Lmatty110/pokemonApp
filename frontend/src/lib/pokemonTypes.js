export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export const TYPE_LABELS = {
  normal: "Normale", fire: "Fuoco", water: "Acqua", electric: "Elettro", grass: "Erba",
  ice: "Ghiaccio", fighting: "Lotta", poison: "Veleno", ground: "Terra", flying: "Volante",
  psychic: "Psico", bug: "Coleottero", rock: "Roccia", ghost: "Spettro", dragon: "Drago",
  dark: "Buio", steel: "Acciaio", fairy: "Folletto",
};

export const TYPE_COLORS = {
  normal: "#919AA2", fire: "#FF9D55", water: "#5090D6", electric: "#F4D23C", grass: "#63BC5A",
  ice: "#73CEC0", fighting: "#CE416B", poison: "#AA6BC8", ground: "#D97845", flying: "#89AAE3",
  psychic: "#FA7179", bug: "#91C12F", rock: "#C5B78C", ghost: "#5269AD", dragon: "#0B6DC3",
  dark: "#5A5465", steel: "#5A8EA2", fairy: "#EC8FE6",
};

// Moltiplicatori: tipo della mossa -> tipo del bersaglio.
const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export const getAttackMultiplier = (attackType, defenderTypes) => (
  defenderTypes.reduce((total, defenderType) => total * (TYPE_CHART[attackType]?.[defenderType] ?? 1), 1)
);

const groupByMultiplier = (entries) => ({
  superEffective: entries.filter(entry => entry.multiplier > 1),
  neutral: entries.filter(entry => entry.multiplier === 1),
  resisted: entries.filter(entry => entry.multiplier > 0 && entry.multiplier < 1),
  immune: entries.filter(entry => entry.multiplier === 0),
});

export const calculateTypeMatchups = (selectedTypes) => {
  const types = [...new Set(selectedTypes)].filter(type => POKEMON_TYPES.includes(type)).slice(0, 2);
  if (!types.length) return null;

  const defensiveEntries = POKEMON_TYPES.map(type => ({
    type,
    multiplier: getAttackMultiplier(type, types),
  })).sort((a, b) => b.multiplier - a.multiplier || TYPE_LABELS[a.type].localeCompare(TYPE_LABELS[b.type]));

  // Con due tipi, la copertura offensiva usa il migliore dei due attacchi STAB disponibili.
  const offensiveEntries = POKEMON_TYPES.map(type => ({
    type,
    multiplier: Math.max(...types.map(attackType => getAttackMultiplier(attackType, [type]))),
  })).sort((a, b) => b.multiplier - a.multiplier || TYPE_LABELS[a.type].localeCompare(TYPE_LABELS[b.type]));

  return {
    types,
    defense: groupByMultiplier(defensiveEntries),
    offense: groupByMultiplier(offensiveEntries),
  };
};

export const formatMultiplier = multiplier => `×${String(multiplier).replace("0.5", "0,5").replace("0.25", "0,25")}`;

