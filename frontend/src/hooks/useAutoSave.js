import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAutoSave } from "../lib/autoSave";

export default function useAutoSave({ resourceKey, value, initialValue, enabled, save, onSaved, validate, delay = 650 }) {
  const mounted = useRef(false);
  const controller = useMemo(() => createAutoSave(resourceKey, {}), [resourceKey]);
  const activeController = useRef(controller);
  activeController.current = controller;
  controller.setOptions({ save, delay, validate, onSaved: (result, snapshot) => {
    if (mounted.current && activeController.current === controller) onSaved?.(result, snapshot);
  } });
  const serialized = JSON.stringify(value);

  useLayoutEffect(() => {
    if (!enabled) return;
    controller.initialize(initialValue);
    controller.update(JSON.parse(serialized));
  }, [controller, enabled, initialValue, serialized]);

  useEffect(() => {
    mounted.current = true;
    const retry = () => controller.retry();
    const flush = () => { if (document.visibilityState === "hidden") controller.flush(); };
    const beforeUnload = (event) => {
      if (!controller.getState().dirty) return;
      controller.flush();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("online", retry);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", flush);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", retry);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", flush);
      controller.flush();
    };
  }, [controller]);

  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return { ...state, flush: controller.flush, retry: controller.retry, discard: controller.discard };
}
