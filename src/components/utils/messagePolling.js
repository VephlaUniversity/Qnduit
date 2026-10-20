// One cycle at a time; timers start after completion, not at fixed intervals.
export function startMessagePolling({ run, onError, onSuccess, onUnauthorized, intervalMs = 3000, maxDelayMs = 30000 }) {
  let timer, controller, running = false, stopped = false, expired = false, immediate = false, failures = 0;
  const available = () => document.visibilityState !== "hidden" && navigator.onLine !== false;
  const schedule = delay => {
    clearTimeout(timer);
    if (!stopped && !expired && available()) timer = setTimeout(tick, delay);
  };
  async function tick() {
    if (stopped || expired || running || !available()) return;
    running = true;
    immediate = false;
    controller = new AbortController();
    try {
      const completed = await run(controller.signal);
      if (completed !== false && !controller.signal.aborted && !stopped) { failures = 0; onSuccess(); }
    } catch (error) {
      if (!controller.signal.aborted && !stopped) {
        if (error.response?.status === 401) { expired = true; onUnauthorized(); }
        else { failures++; onError(); }
      }
    } finally {
      running = false;
      schedule(immediate ? 0 : Math.min(maxDelayMs, intervalMs * 2 ** Math.min(failures, 4)));
    }
  }
  const wake = () => {
    clearTimeout(timer);
    if (!available()) { controller?.abort(); return; }
    immediate = true;
    if (!running) schedule(0);
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("online", wake);
  window.addEventListener("offline", wake);
  schedule(intervalMs);
  return {
    wake,
    cancel() { controller?.abort(); },
    stop() {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", wake);
      for (const event of ["focus", "online", "offline"]) window.removeEventListener(event, wake);
    },
  };
}

export async function messagePages(getPage, { cutoff, chats = false } = {}) {
  let before;
  const cursors = new Set(), rows = [];
  do {
    const data = await getPage(before);
    const page = chats ? data.results : data.messages;
    if (!Array.isArray(page) || page.length > 100 || !data.pagination || typeof data.pagination.hasMore !== "boolean") throw new Error("Invalid page");
    rows.push(...page);
    if (!chats && cutoff !== undefined && cutoff !== null && page.some(message => !message.createdAt || new Date(message.createdAt).getTime() < cutoff)) break;
    before = data.pagination.hasMore ? data.pagination.nextCursor : null;
    if (before && (typeof before !== "string" || cursors.has(before))) throw new Error("Invalid cursor");
    if (data.pagination.hasMore && !before) throw new Error("Missing cursor");
    if (before) cursors.add(before);
  } while (before);
  if (!chats) return rows;
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.role}:${row._id}`, previous = unique.get(key);
    if (!previous || new Date(row.lastMessageAt || 0) >= new Date(previous.lastMessageAt || 0)) unique.set(key, row);
  }
  return [...unique.values()];
}
