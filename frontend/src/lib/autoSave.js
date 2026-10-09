const pendingSaves = new Map();
// API records and form values may have the same fields in a different order.
const serialize = (value) => JSON.stringify(value, (_, entry) =>
  entry && typeof entry === "object" && !Array.isArray(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]))
    : entry
);
const clone = (value) => JSON.parse(serialize(value));

export const changedFields = (value, previous) => Object.fromEntries(
  Object.entries(value).filter(([key, entry]) => serialize(entry) !== serialize(previous[key]))
);

// A detached editor can finish its writes before the next editor loads the same record.
export async function recoverPendingSave(key) {
  const controller = pendingSaves.get(key);
  if (!controller) return null;
  await controller.flush();
  controller.cancelTimer();
  const draft = controller.getDraft();
  if (pendingSaves.get(key) === controller) pendingSaves.delete(key);
  return draft;
}

export async function recoverPendingSaves(prefix) {
  const keys = [...pendingSaves.keys()].filter(key => key.startsWith(prefix));
  return Object.fromEntries(await Promise.all(keys.map(async key => [key, await recoverPendingSave(key)])));
}

export function createAutoSave(key, options) {
  let settings = options;
  let baseline;
  let latest;
  let initialized = false;
  let timer;
  let running = null;
  let failures = 0;
  let lastEdit = 0;
  let state = { phase: "idle", dirty: false, error: "" };
  const listeners = new Set();
  const dirty = () => initialized && serialize(latest) !== serialize(baseline);
  const cancelTimer = () => { clearTimeout(timer); timer = undefined; };

  const emit = (phase, error = "") => {
    state = { phase, dirty: dirty() || Boolean(running), error };
    if (state.dirty) pendingSaves.set(key, controller);
    else if (pendingSaves.get(key) === controller) pendingSaves.delete(key);
    listeners.forEach(listener => listener());
  };

  const schedule = (delay = Math.max(0, (settings.delay ?? 650) - (Date.now() - lastEdit))) => {
    cancelTimer();
    timer = setTimeout(() => controller.flush(false), delay);
  };

  const controller = {
    setOptions: (next) => { settings = next; },
    getState: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    cancelTimer,
    getDraft: () => dirty() ? clone(latest) : null,
    discard: () => {
      cancelTimer();
      if (!initialized) return;
      latest = clone(baseline);
      failures = 0;
      emit(running ? "saving" : "idle");
    },
    initialize: (value) => {
      if (initialized) return;
      baseline = clone(value);
      latest = clone(value);
      initialized = true;
    },
    update: (value) => {
      if (!initialized || serialize(value) === serialize(latest)) return;
      latest = clone(value);
      lastEdit = Date.now();
      failures = 0;
      cancelTimer();
      if (running) { emit("saving"); return; }
      if (!dirty()) { emit("saved"); return; }
      const validation = settings.validate?.(latest);
      if (validation) { emit("invalid", validation); return; }
      emit("pending");
      schedule();
    },
    retry: () => { failures = 0; return controller.flush(); },
    flush: async (drain = true) => {
      cancelTimer();
      if (running) {
        const success = await running;
        return success && drain ? controller.flush() : success;
      }
      if (!dirty()) return true;
      const validation = settings.validate?.(latest);
      if (validation) { emit("invalid", validation); return false; }
      const snapshot = clone(latest);
      const previous = clone(baseline);
      // Capture this record's writer, even if React switches the selected record.
      const save = settings.save;
      const onSaved = settings.onSaved;
      const operation = async () => {
        await Promise.resolve();
        try {
          const result = await save(snapshot, previous);
          baseline = snapshot;
          failures = 0;
          running = null;
          onSaved?.(result, snapshot);
          if (dirty()) {
            const validation = settings.validate?.(latest);
            if (validation) { emit("invalid", validation); return false; }
            emit("pending");
            if (drain) return controller.flush();
            schedule();
          } else emit("saved");
          return true;
        } catch (error) {
          running = null;
          const detail = error.response?.data?.detail;
          emit("error", typeof detail === "string" ? detail : "Non è stato possibile salvare. Controlla la connessione e riprova.");
          const status = error.response?.status;
          if ((!status || status >= 500 || status === 429) && failures < 2) schedule(1500 * 2 ** failures++);
          return false;
        }
      };
      running = operation();
      emit("saving");
      return running;
    },
  };
  return controller;
}
