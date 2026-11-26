import { filterLearnset, latestLearnsetGroup } from "./learnsets";

const group = (name, id) => ({ name, url: `https://pokeapi.co/api/v2/version-group/${id}/` });
const detail = (version, method, level = 0) => ({
  version_group: version, move_learn_method: { name: method }, level_learned_at: level,
});

test("finds the newest available version independently for levels and machines", () => {
  const old = group("sun-moon", 17);
  const newer = group("brilliant-diamond-shining-pearl", 23);
  const latest = group("scarlet-violet", 25);
  const moves = [
    { move: { name: "tackle" }, version_group_details: [detail(old, "level-up", 1), detail(latest, "level-up", 1)] },
    { move: { name: "thunderbolt" }, version_group_details: [detail(old, "machine"), detail(newer, "machine")] },
  ];
  expect(latestLearnsetGroup(moves, "level-up")?.name).toBe("scarlet-violet");
  expect(latestLearnsetGroup(moves, "machine")?.name).toBe("brilliant-diamond-shining-pearl");
});

test("keeps both learn methods when PokeAPI lists them for the same move and version", () => {
  const version = group("scarlet-violet", 25);
  const moves = [{ move: { name: "tackle" }, version_group_details: [
    detail(version, "level-up", 4), detail(version, "machine"),
  ] }];
  expect(filterLearnset(moves, version.name, "level-up")).toMatchObject([{ level: 4 }]);
  expect(filterLearnset(moves, version.name, "machine")).toHaveLength(1);
});
