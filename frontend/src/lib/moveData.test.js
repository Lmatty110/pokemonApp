import axios from "axios";
import { getMoveData } from "./moveData";

jest.mock("axios");

test("lists and effect dialogs share cached and in-flight move requests", async () => {
  axios.get.mockResolvedValueOnce({ data: { name: "test-cached" } });
  const first = getMoveData("test-cached");
  const second = getMoveData("test-cached");
  expect(second).toBe(first);
  expect(await first).toEqual({ name: "test-cached" });
  expect(await getMoveData("test-cached")).toEqual({ name: "test-cached" });
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test("failed requests are evicted so the user can retry", async () => {
  axios.get.mockReset();
  axios.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { name: "test-retry" } });
  await expect(getMoveData("test-retry")).rejects.toThrow("offline");
  await expect(getMoveData("test-retry")).resolves.toEqual({ name: "test-retry" });
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get).toHaveBeenLastCalledWith("https://pokeapi.co/api/v2/move/test-retry/", { timeout: 15000 });
});
