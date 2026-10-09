import { changedFields, createAutoSave, recoverPendingSave } from "./autoSave";

const settle = async () => { for (let index = 0; index < 15; index++) await Promise.resolve(); };
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

describe("automatic saving", () => {
  let controllers;
  let sequence = 0;
  const create = (options = {}) => {
    const key = `test:${sequence++}`;
    const save = jest.fn().mockResolvedValue({});
    const controller = createAutoSave(key, { save, delay: 650, ...options });
    controller.initialize({ notes: "", nickname: null });
    controllers.push(controller);
    return { controller, save, key };
  };
  const advance = async (ms) => { jest.advanceTimersByTime(ms); await settle(); };

  beforeEach(() => { controllers = []; jest.useFakeTimers("modern"); });
  afterEach(() => { controllers.forEach(controller => controller.cancelTimer()); jest.useRealTimers(); });

  test("loading a record does not write default values to the server", async () => {
    const { controller, save } = create();
    controller.update({ notes: "", nickname: null });
    await advance(1000);
    expect(save).not.toHaveBeenCalled();
    expect(controller.getState().dirty).toBe(false);
  });

  test("field order does not create spurious writes or patches", async () => {
    const { controller, save } = create();
    controller.update({ nickname: null, notes: "" });
    await advance(1000);
    expect(save).not.toHaveBeenCalled();
    expect(controller.getState().dirty).toBe(false);
    expect(changedFields({ held_item: { name: "potion", sprite: "" } },
      { held_item: { sprite: "", name: "potion" } })).toEqual({});
  });

  test("typing is debounced and saves only the latest text", async () => {
    const { controller, save } = create();
    controller.update({ notes: "A", nickname: null });
    await advance(400);
    controller.update({ notes: "Appunti finali", nickname: null });
    await advance(649);
    expect(save).not.toHaveBeenCalled();
    await advance(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].notes).toBe("Appunti finali");
    expect(controller.getState()).toMatchObject({ phase: "saved", dirty: false });
  });

  test("reverting a change before the debounce requires no request", async () => {
    const { controller, save } = create();
    controller.update({ notes: "Temporary", nickname: null });
    controller.update({ notes: "", nickname: null });
    await advance(1000);
    expect(save).not.toHaveBeenCalled();
  });

  test("edits during a slow write are queued without being overwritten", async () => {
    const first = deferred();
    const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValue({});
    const { controller } = create({ save });
    controller.update({ notes: "First", nickname: null });
    await advance(650);
    controller.update({ notes: "Latest", nickname: "Sparky" });
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve({ notes: "First" });
    await settle();
    expect(controller.getDraft()).toEqual({ notes: "Latest", nickname: "Sparky" });
    await advance(650);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual([{ notes: "Latest", nickname: "Sparky" }, { notes: "First", nickname: null }]);
    expect(controller.getState().phase).toBe("saved");
  });

  test("leaving the editor immediately flushes changes without waiting", async () => {
    const { controller, save } = create();
    controller.update({ notes: "Before leaving", nickname: null });
    expect(await controller.flush()).toBe(true);
    expect(save.mock.calls[0][0].notes).toBe("Before leaving");
    expect(controller.getState().dirty).toBe(false);
  });

  test("reverting text during a request sends the final value afterwards", async () => {
    const first = deferred();
    const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValue({});
    const { controller } = create({ save });
    controller.update({ notes: "Temporary", nickname: null });
    await advance(650);
    controller.update({ notes: "", nickname: null });
    first.resolve({});
    await settle();
    await advance(650);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].notes).toBe("");
    expect(controller.getState().dirty).toBe(false);
  });

  test("a flush during an in-flight write drains the most recent edit", async () => {
    const first = deferred();
    const save = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValue({});
    const { controller } = create({ save });
    controller.update({ notes: "First", nickname: null });
    await advance(650);
    controller.update({ notes: "Final", nickname: null });
    const flushed = controller.flush();
    first.resolve({});
    expect(await flushed).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].notes).toBe("Final");
  });

  test("invalid values remain visible and are never persisted", async () => {
    const save = jest.fn().mockResolvedValue({});
    const controller = createAutoSave(`test:${sequence++}`, { save,
      validate: value => value.level > 100 ? "Livello non valido" : "" });
    controllers.push(controller);
    controller.initialize({ level: 10 });
    controller.update({ level: 101 });
    await advance(1000);
    expect(await controller.flush()).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({ phase: "invalid", dirty: true, error: "Livello non valido" });
    controller.update({ level: 25 });
    await advance(650);
    expect(save.mock.calls[0][0].level).toBe(25);
  });

  test("a failed request keeps the draft and can be retried", async () => {
    const error = { response: { status: 400, data: { detail: "Salvataggio non riuscito" } } };
    const save = jest.fn().mockRejectedValueOnce(error).mockResolvedValue({});
    const { controller } = create({ save });
    controller.update({ notes: "Keep this", nickname: null });
    expect(await controller.flush()).toBe(false);
    expect(controller.getState()).toMatchObject({ phase: "error", dirty: true });
    expect(controller.getDraft().notes).toBe("Keep this");
    expect(await controller.retry()).toBe(true);
    expect(controller.getState()).toMatchObject({ phase: "saved", dirty: false });
  });

  test("temporary network failures retry with a bounded delay", async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    const { controller } = create({ save });
    controller.update({ notes: "Offline draft", nickname: null });
    await advance(650);
    expect(controller.getState().phase).toBe("error");
    await advance(1500);
    expect(save).toHaveBeenCalledTimes(2);
    expect(controller.getState().phase).toBe("saved");
  });

  test("an older record uses its captured writer even when settings change", async () => {
    const first = deferred();
    const oldWriter = jest.fn().mockReturnValue(first.promise);
    const newWriter = jest.fn().mockResolvedValue({});
    const { controller } = create({ save: oldWriter });
    controller.update({ notes: "Old record", nickname: null });
    await advance(650);
    controller.setOptions({ save: newWriter });
    first.resolve({});
    await settle();
    expect(oldWriter).toHaveBeenCalledTimes(1);
    expect(newWriter).not.toHaveBeenCalled();
  });

  test("automatic retries stop after two unsuccessful attempts", async () => {
    const save = jest.fn().mockRejectedValue(new Error("offline"));
    const { controller } = create({ save });
    controller.update({ notes: "Keep offline draft", nickname: null });
    await advance(650);
    await advance(1500);
    await advance(3000);
    await advance(15000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(controller.getState()).toMatchObject({ phase: "error", dirty: true });
    expect(controller.getDraft().notes).toBe("Keep offline draft");
  });

  test("reopening a record finishes its detached editor first", async () => {
    const { controller, save, key } = create();
    controller.update({ notes: "Leaving quickly", nickname: null });
    expect(await recoverPendingSave(key)).toBeNull();
    expect(save.mock.calls[0][0].notes).toBe("Leaving quickly");
  });

  test("reopening a failed editor recovers its unsaved values", async () => {
    const save = jest.fn().mockRejectedValue({ response: { status: 400 } });
    const { controller, key } = create({ save });
    controller.update({ notes: "Recover me", nickname: null });
    expect(await recoverPendingSave(key)).toEqual({ notes: "Recover me", nickname: null });
  });

  test("clearing values produces an explicit partial update", () => {
    expect(changedFields({ nickname: null, level: null, notes: "", ability: "static" },
      { nickname: "Spark", level: 10, notes: "Old note", ability: "static" }))
      .toEqual({ nickname: null, level: null, notes: "" });
  });
});
