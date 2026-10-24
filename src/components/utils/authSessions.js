export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";
const keys = {
  user: { user: "user", token: "token", notice: "qnduit:auth-notice:user" },
  admin: { user: "adminUser", token: "adminToken", notice: "qnduit:auth-notice:admin" },
};
const failureCodes = new Set(["AUTH_SESSION_EXPIRED", "AUTH_TOKEN_INVALID", "AUTH_ACCOUNT_MISSING"]);
const tokenClaims = token => {
  try {
    const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(payload));
  } catch { return null; }
};
export function tokenExpiry(token) {
  const claims = tokenClaims(token);
  return Number.isFinite(claims?.exp) ? claims.exp * 1000 : null;
}
const matchesIdentity = (user, token) => {
  const claims = tokenClaims(token);
  return claims && String(claims.id) === String(user?.id || user?._id) && (!claims.role || claims.role === user?.userType);
};

// Decoding exp schedules browser cleanup only. The server still verifies every
// protected request; no client-side JWT decoding grants server authorization.
export function createAuthSessions({ storage, events, now = Date.now, timers = globalThis, onChange = () => {}, onEnd = () => {} }) {
  let timer, version = 0, previous = "", active = false, known = { user: null, admin: null };
  const read = scope => {
    try {
      const user = JSON.parse(storage.getItem(keys[scope].user));
      const token = storage.getItem(keys[scope].token) || (scope === "user" ? storage.getItem("authToken") : null);
      return user && (user.id || user._id) && token && matchesIdentity(user, token) && (scope === "admin" ? user.userType === "admin" : ["talent", "employer"].includes(user.userType)) ? { user, token } : null;
    } catch { return null; }
  };
  const stamp = () => JSON.stringify([version, read("user"), read("admin")]);
  const notify = () => events.dispatchEvent(new Event("qnduit:polling-session-changed"));
  const clear = (scope, expectedToken, message = "") => {
    const current = read(scope);
    if (expectedToken && current?.token !== expectedToken) return false;
    if (message) storage.setItem(keys[scope].notice, message); else storage.removeItem(keys[scope].notice);
    storage.removeItem(keys[scope].user); storage.removeItem(keys[scope].token);
    if (scope === "user") { storage.removeItem("authToken"); storage.removeItem("pendingPlanSelection"); }
    notify();
    return true;
  };
  const sync = () => {
    timers.clearTimeout(timer);
    const ended = [];
    for (const scope of ["user", "admin"]) {
      const session = read(scope);
      if (!session && (storage.getItem(keys[scope].user) || storage.getItem(keys[scope].token) || scope === "user" && storage.getItem("authToken"))) {
        const hadIdentity = Boolean(storage.getItem(keys[scope].user));
        clear(scope, undefined, hadIdentity ? SESSION_EXPIRED_MESSAGE : "");
        if (hadIdentity) ended.push(scope);
      }
      if (session && (tokenExpiry(session.token) === null || tokenExpiry(session.token) <= now())) {
        if (clear(scope, session.token, SESSION_EXPIRED_MESSAGE)) ended.push(scope);
      }
    }
    const user = read("user"), admin = read("admin");
    for (const scope of ["user", "admin"]) {
      const current = scope === "user" ? user : admin;
      if (known[scope] && !current && storage.getItem(keys[scope].notice) === SESSION_EXPIRED_MESSAGE && !ended.includes(scope)) ended.push(scope);
      known[scope] = current;
    }
    const snapshot = { user: user?.user || null, adminUser: admin?.user || null,
      sessionMessage: storage.getItem(keys.user.notice) || "", adminSessionMessage: storage.getItem(keys.admin.notice) || "" };
    const identity = JSON.stringify([user, admin]);
    if (identity !== previous) { previous = identity; version++; }
    onChange(snapshot);
    const deadlines = [user, admin].filter(Boolean).map(session => tokenExpiry(session.token));
    if (active && deadlines.length) timer = timers.setTimeout(sync, Math.min(2147483647, Math.max(1, Math.min(...deadlines) - now())));
    ended.forEach(scope => onEnd(scope, SESSION_EXPIRED_MESSAGE));
    return snapshot;
  };
  const changed = () => sync();
  const rejected = event => {
    const { actor, token, code } = event.detail || {};
    if (!failureCodes.has(code)) return;
    const scope = actor?.startsWith("admin:") ? "admin" : "user";
    const session = read(scope);
    if (!session || `${session.user.userType}:${session.user.id || session.user._id}` !== actor || session.token !== token) return;
    if (clear(scope, token, SESSION_EXPIRED_MESSAGE)) sync();
  };
  return {
    read, sync, revision: stamp,
    adopt({ user, token }, scope = "user", expectedVersion = stamp()) {
      if (expectedVersion !== stamp()) throw Object.assign(Error("Session changed"), { code: "ERR_CANCELED" });
      if (!user || !(user.id || user._id) || !token || !matchesIdentity(user, token) || (scope === "admin" ? user.userType !== "admin" : !["talent", "employer"].includes(user.userType)) || !(tokenExpiry(token) > now())) throw Error("Invalid authenticated session returned from server.");
      storage.removeItem(keys[scope].notice);
      storage.setItem(keys[scope].token, token);
      storage.setItem(keys[scope].user, JSON.stringify(user));
      if (scope === "user") storage.removeItem("authToken");
      sync(); notify();
      return user;
    },
    clear(scope = "user", expectedToken = read(scope)?.token || null) {
      if ((read(scope)?.token || null) !== expectedToken) return false;
      clear(scope, expectedToken || undefined); sync(); return true;
    },
    start() {
      active = true; sync();
      for (const event of ["storage", "focus", "pageshow"]) events.addEventListener(event, changed);
      events.addEventListener("qnduit:auth-failure", rejected);
      events.document?.addEventListener("visibilitychange", changed);
      return () => {
        active = false; timers.clearTimeout(timer);
        for (const event of ["storage", "focus", "pageshow"]) events.removeEventListener(event, changed);
        events.removeEventListener("qnduit:auth-failure", rejected);
        events.document?.removeEventListener("visibilitychange", changed);
      };
    },
  };
}
