import { useCallback, useRef, useState } from "react";

// UI-only helper: tracks which action is running so its button can show a
// spinner and ignore repeat clicks. It never changes what the action sends.
export function useBusyAction() {
  const [busy, setBusy] = useState("");
  const lock = useRef(false);

  const run = useCallback(async (key, action) => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(key);
    try {
      return await action();
    } finally {
      lock.current = false;
      setBusy("");
    }
  }, []);

  return { busy, run };
}
