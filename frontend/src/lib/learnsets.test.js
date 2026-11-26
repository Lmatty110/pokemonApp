import { filterLearnset, latestLearnsetGroup } from "./learnsets";

const group = (name, id) => ({ name, url: `https://pokeapi.co/api/v2/version-group/${id}/` });
const detail = (version, method, level = 0) => ({
  version_group: version, move_learn_method: { name: method }, level_learned_at: level,
});

test("uses only the three requested games, independently for levels and machines", () => {
  const ultra = group("ultra-sun-ultra-moon", 18);
  const sword = group("sword-shield", 20);
  const scarlet = group("scarlet-violet", 25);
  const excluded = [
    group("lets-go-pikachu-lets-go-eevee", 19),
    group("brilliant-diamond-shining-pearl", 23),
    group("legends-arceus", 24),
    group("legends-z-a", 26),
  ];
  const moves = [
    { move: { name: "tackle" }, version_group_details: [detail(ultra, "level-up", 1), detail(scarlet, "level-up", 1), ...excluded.map(version => detail(version, "level-up", 2))] },
    { move: { name: "thunderbolt" }, version_group_details: [detail(ultra, "machine"), detail(sword, "machine"), ...excluded.map(version => detail(version, "machine"))] },
  ];
  expect(latestLearnsetGroup(moves, "level-up")?.name).toBe("scarlet-violet");
  expect(latestLearnsetGroup(moves, "machine")?.name).toBe("sword-shield");
  expect(filterLearnset(moves, "legends-z-a", "level-up")).toEqual([]);
  expect(filterLearnset(moves, "legends-arceus", "machine")).toEqual([]);
});

test("falls back to Ultrasole e Ultraluna and leaves unsupported games unused", () => {
  const ultra = group("ultra-sun-ultra-moon", 18);
  const excluded = group("legends-arceus", 24);
  const moves = [{ move: { name: "tackle" }, version_group_details: [detail(ultra, "level-up", 3), detail(excluded, "machine")] }];
  expect(latestLearnsetGroup(moves, "level-up")?.name).toBe("ultra-sun-ultra-moon");
  expect(latestLearnsetGroup(moves, "machine")).toBeNull();
});

test("keeps both learn methods when PokeAPI lists them for the same move and version", () => {
  const version = group("scarlet-violet", 25);
  const moves = [{ move: { name: "tackle" }, version_group_details: [
    detail(version, "level-up", 4), detail(version, "machine"),
  ] }];
  expect(filterLearnset(moves, version.name, "level-up")).toMatchObject([{ level: 4 }]);
  expect(filterLearnset(moves, version.name, "machine")).toHaveLength(1);
});
