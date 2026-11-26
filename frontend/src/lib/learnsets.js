const VERSION_NAMES = {
  "scarlet-violet": "Pokémon Scarlatto e Violetto",
  "legends-z-a": "Leggende Pokémon: Z-A",
  "legends-arceus": "Leggende Pokémon: Arceus",
  "brilliant-diamond-shining-pearl": "Pokémon Diamante Lucente e Perla Splendente",
  "sword-shield": "Pokémon Spada e Scudo",
  "lets-go-pikachu-lets-go-eevee": "Pokémon Let's Go, Pikachu! e Let's Go, Eevee!",
  "ultra-sun-ultra-moon": "Pokémon Ultrasole e Ultraluna",
  "sun-moon": "Pokémon Sole e Luna",
  "omega-ruby-alpha-sapphire": "Pokémon Rubino Omega e Zaffiro Alpha",
  "x-y": "Pokémon X e Y",
  "black-2-white-2": "Pokémon Nero 2 e Bianco 2",
  "black-white": "Pokémon Nero e Bianco",
};

const groupId = group => Number(group?.url?.match(/\/(\d+)\/?$/)?.[1] || 0);

export function latestLearnsetGroup(moves, method) {
  const groups = new Map();
  for (const move of moves || []) {
    for (const detail of move.version_group_details || []) {
      if (detail.move_learn_method?.name === method) {
        const group = detail.version_group;
        groups.set(group.name, group);
      }
    }
  }
  const latest = [...groups.values()].sort((a, b) => groupId(b) - groupId(a))[0];
  return latest ? {
    name: latest.name,
    displayName: VERSION_NAMES[latest.name] || latest.name.replaceAll("-", " "),
  } : null;
}

export function filterLearnset(moves, groupName, method) {
  if (!groupName) return [];
  return (moves || []).flatMap(move => {
    const details = (move.version_group_details || []).filter(detail =>
      detail.version_group.name === groupName && detail.move_learn_method.name === method);
    return details.length ? [{ ...move, level: Math.min(...details.map(detail => detail.level_learned_at)) }] : [];
  });
}
