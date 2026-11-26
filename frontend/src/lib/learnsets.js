// Only these games use the standard level-up and TM learnsets shown in the app.
const VERSION_GROUPS = [
  { name: "scarlet-violet", displayName: "Pokémon Scarlatto e Violetto" },
  { name: "sword-shield", displayName: "Pokémon Spada e Scudo" },
  { name: "ultra-sun-ultra-moon", displayName: "Pokémon Ultrasole e Ultraluna" },
];

export function latestLearnsetGroup(moves, method) {
  return VERSION_GROUPS.find(group => (moves || []).some(move =>
    (move.version_group_details || []).some(detail =>
      detail.version_group?.name === group.name && detail.move_learn_method?.name === method
    ))) || null;
}

export function filterLearnset(moves, groupName, method) {
  if (!VERSION_GROUPS.some(group => group.name === groupName)) return [];
  return (moves || []).flatMap(move => {
    const details = (move.version_group_details || []).filter(detail =>
      detail.version_group.name === groupName && detail.move_learn_method.name === method);
    return details.length ? [{ ...move, level: Math.min(...details.map(detail => detail.level_learned_at)) }] : [];
  });
}
