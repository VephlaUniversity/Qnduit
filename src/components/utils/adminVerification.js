export const badgeLabel = account => account?.hasVerificationBadge === true ? "Verified" : "Unverified";
const paths = { talent: "talents", employer: "employers" };

// Owns one mounted admin view. Read generations and mutation locks are separate:
// older list/filter responses cannot overwrite a confirmed badge decision.
export function createAdminVerificationSession({ client, baseUrl, getToken, onPending = () => {} }) {
  let active = true, epoch = 0, readVersion = 0;
  const pending = new Map(), reads = new Set();
  const invalidateReads = () => {
    readVersion++;
    for (const controller of reads) controller.abort();
    reads.clear();
  };
  const notify = () => onPending([...pending.keys()]);
  return {
    activate() { active = true; notify(); },
    dispose() {
      active = false; epoch++; invalidateReads();
      for (const context of pending.values()) context.controller.abort();
      pending.clear();
    },
    beginRead() {
      invalidateReads();
      const version = readVersion, owner = epoch, token = getToken(), controller = new AbortController();
      if (!active || !token) controller.abort();
      else reads.add(controller);
      return { token, signal: controller.signal,
        current: () => active && !controller.signal.aborted && epoch === owner && version === readVersion && getToken() === token && pending.size === 0,
        finish: () => reads.delete(controller),
      };
    },
    async setBadge(type, id, verified) {
      if (!Object.hasOwn(paths, type) || !/^[a-f\d]{24}$/i.test(String(id)) || typeof verified !== "boolean") {
        throw new Error("Invalid badge decision.");
      }
      const key = `${type}:${id}`;
      if (!active || pending.has(key)) return null;
      const token = getToken();
      if (!token) throw new Error("Your admin session has expired.");
      const owner = epoch, controller = new AbortController();
      const context = { controller };
      const current = () => active && !controller.signal.aborted && epoch === owner && getToken() === token;
      pending.set(key, context); invalidateReads(); notify();
      try {
        const response = await client.patch(`${baseUrl}/api/admin/${paths[type]}/${encodeURIComponent(id)}/verification`, { verified }, {
          signal: controller.signal, headers: { Authorization: `Bearer ${token}` },
        });
        if (!current()) return null;
        const account = response.data?.[type];
        if (response.data?.success !== true || String(account?._id) !== String(id) || typeof account?.hasVerificationBadge !== "boolean") {
          throw new Error("The server returned an invalid badge result.");
        }
        return { account, current };
      } catch (error) {
        if (!current()) return null;
        throw error;
      } finally {
        if (pending.get(key) === context) { pending.delete(key); if (active) notify(); }
      }
    },
  };
}
