import { useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions, requestSafety } from "../utils/requestSafety";
import { startMessagePolling } from "../utils/messagePolling";

// Reuse the existing visible/online polling lifecycle; no push transport exists.
export function useAccountSession(user) {
  const actor = user && `${user.userType}:${user.id || user._id}`;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  useEffect(() => {
    if (!token || !["talent", "employer"].includes(user?.userType)) return;
    const current = () => browserSessions().some(owner => owner.actor === actor && owner.token === token);
    const loop = startMessagePolling({
      intervalMs: 15000, maxDelayMs: 60000,
      async run(signal) {
        if (!current()) return false;
        let response;
        try { response = await axios.get(`${API_BASE_URL}/api/auth/session`, { signal, timeout: 10000, headers: { Authorization: `Bearer ${token}` } }); }
        catch (error) {
          if (error.response?.status === 401 && !["AUTH_SESSION_EXPIRED", "AUTH_TOKEN_INVALID", "AUTH_ACCOUNT_MISSING"].includes(error.response.data?.code)) throw Error("Account status unavailable.");
          throw error;
        }
        const { data } = response;
        if (signal.aborted || !current()) return false;
        if (!data?.success || `${data.session?.role}:${data.session?.id}` !== actor || !["active", "suspended"].includes(data.session.accountStatus)) throw Error("Account status unavailable.");
        if (data.session.accountStatus === "suspended") requestSafety.note({ status: 403, data: { code: "ACCOUNT_SUSPENDED" } }, actor);
        // Resumption after suspension remains an explicit account-status check.
      },
      onSuccess() {}, onError() {}, onUnauthorized() {},
    });
    loop.wake();
    const changed = () => { if (!current()) loop.stop(); };
    window.addEventListener("storage", changed);
    window.addEventListener("qnduit:polling-session-changed", changed);
    return () => {
      loop.stop();
      window.removeEventListener("storage", changed);
      window.removeEventListener("qnduit:polling-session-changed", changed);
    };
  }, [actor, token, user?.userType]);
}
