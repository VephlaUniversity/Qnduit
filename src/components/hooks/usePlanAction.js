import { useRef, useState } from "react";

// Guard the entire plan group, including clicks before React renders disabled buttons.
export function usePlanAction(onAction) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const submit = async (plan, action) => {
    if (inFlight.current || !onAction) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onAction(plan, action);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return { pending, submit };
}
