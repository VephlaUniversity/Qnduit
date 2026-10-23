import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "../utils/api";
import { createAdminVerificationSession } from "../utils/adminVerification";
import { useAuth } from "./useAuth";
import { requestSafety, shouldRefreshBadgeFailure } from "../utils/requestSafety";

export function useAdminBadgeActions({ onSaved, refresh }) {
  const { adminUser } = useAuth();
  const safety = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (safety.generalUntil <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), safety.generalUntil - Date.now());
    return () => clearTimeout(timer);
  }, [safety.generalUntil, now]);
  const [pending, setPending] = useState([]);
  const [session] = useState(() => createAdminVerificationSession({
    client: axios, baseUrl: API_BASE_URL, getToken: () => localStorage.getItem("adminToken"), onPending: setPending,
  }));
  const callbacks = useRef({ onSaved, refresh });
  useLayoutEffect(() => { callbacks.current = { onSaved, refresh }; }, [onSaved, refresh]);
  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session, adminUser?.id]);
  return {
    beginRead: session.beginRead,
    pending: (type, id) => safety.generalUntil > Math.max(now, Date.now()) || pending.includes(`${type}:${id}`),
    async setBadge(type, id, verified) {
      let result;
      try {
        result = await session.setBadge(type, id, verified);
        if (!result?.current()) return;
        callbacks.current.onSaved(type, result.account);
        toast.success(result.account.hasVerificationBadge ? "Verified" : "Unverified");
      } catch (error) {
        toast.error(error.response?.data?.message || error.message || "Unable to update badge");
        // Refresh after failure too: an interrupted request may have reached the server.
        if (shouldRefreshBadgeFailure(error)) await callbacks.current.refresh();
        return;
      }
      if (result?.current()) await callbacks.current.refresh();
    },
  };
}
