import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { API_BASE_URL } from "../utils/api";

const destinations = new Set(["/dashboard/applicants", "/talent-dashboard/my-applied"]);
const empty = { status: "loading", items: [], total: null, next: null, pending: false, more: false, feedback: "" };
const ordered = rows => [...new Map(rows.map(row => [row.id, row])).values()]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id.localeCompare(a.id));
const readable = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date) : "Date unavailable";
};
const validFeed = data => data?.enabled === false || data?.enabled === true
  && Number.isSafeInteger(data.unreadTotal) && data.unreadTotal >= 0 && Array.isArray(data.items) && data.items.length <= 50
  && data.items.every(row => /^[a-f\d]{24}$/i.test(row.id) && typeof row.read === "boolean" && typeof row.text === "string" && destinations.has(row.destination))
  && typeof data.pagination?.hasMore === "boolean" && (!data.pagination.hasMore || typeof data.pagination.nextCursor === "string");

export const NotificationPop = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const supported = user?.userType === "employer" && pathname.startsWith("/dashboard")
    || user?.userType === "talent" && pathname.startsWith("/talent-dashboard");
  const token = localStorage.getItem("token");
  const actor = supported ? `${user.userType}:${user._id || user.id}` : "";
  const scope = JSON.stringify([actor, token]);
  const session = useRef(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState({ ...empty, scope: "" });
  const state = result.scope === scope ? result : empty;
  const active = record => session.current === record && !record.controller.signal.aborted && localStorage.getItem("token") === record.token;
  useLayoutEffect(() => { if (session.current?.scope !== scope) session.current?.controller.abort(); }, [scope]);

  useEffect(() => {
    const record = { scope, token, controller: new AbortController(), requests: new Set(), version: 0, busy: false, mutating: false, expired: false, failures: 0 };
    session.current = record;
    setResult({ ...empty, scope, status: actor && token ? "loading" : "disabled" });
    if (!actor || !token) return () => record.controller.abort();
    const available = () => document.visibilityState !== "hidden" && navigator.onLine !== false;
    const request = async (path, options = {}) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      record.controller.signal.addEventListener("abort", abort, { once: true });
      record.requests.add(controller);
      try { return (await axios({ url: `${API_BASE_URL}/api/notifications${path}`, signal: controller.signal, timeout: 15000,
        headers: { Authorization: `Bearer ${token}` }, ...options })).data; }
      finally { record.requests.delete(controller); record.controller.signal.removeEventListener("abort", abort); }
    };
    record.request = request;
    const schedule = delay => { clearTimeout(record.timer); if (active(record) && !record.expired && available()) record.timer = setTimeout(tick, delay); };
    async function tick() {
      if (!active(record) || record.expired || !available()) return;
      if (record.busy || record.mutating) { schedule(15000); return; }
      record.busy = true;
      record.immediate = false;
      const version = record.version;
      let delay = 15000;
      try {
        const data = await request("", { params: { limit: 20 } });
        if (!active(record) || record.version !== version || !available()) return;
        if (!validFeed(data)) throw new Error();
        record.failures = 0;
        if (!data.enabled) { delay = 120000; setResult({ ...empty, scope, status: "disabled" }); }
        else setResult(previous => {
          const same = previous.scope === scope;
          // If a backlog exceeds the fetched head, restart pagination rather
          // than keeping a cursor that would skip the intervening notifications.
          const overlap = same && data.items.some(row => previous.items.some(old => old.id === row.id));
          const retain = overlap && previous.items.length > data.items.length;
          return { ...(same ? previous : empty), scope, status: "ready", total: data.unreadTotal,
            items: retain ? ordered([...previous.items, ...data.items]) : data.items,
            next: retain ? previous.next : data.pagination.nextCursor, more: false, feedback: "" };
        });
      } catch (error) {
        if (!active(record) || record.version !== version || !available()) return;
        record.failures++;
        record.expired = error.response?.status === 401;
        delay = Math.min(120000, 15000 * 2 ** Math.min(record.failures, 3));
        setResult(previous => ({ ...previous, scope,
          status: error.response?.status === 429 && previous.status === "ready" ? "ready" : "error",
          total: error.response?.status === 429 ? previous.total : null,
          items: record.expired ? [] : previous.items,
          feedback: record.expired ? "Your session has expired. Sign in again." : "Unable to load notifications. Please try again." }));
      } finally { record.busy = false; schedule(record.immediate ? 0 : delay); }
    }
    const wake = () => {
      clearTimeout(record.timer);
      if (!available()) { record.requests.forEach(controller => controller.abort()); return; }
      record.immediate = true;
      if (!record.busy) schedule(0);
    };
    record.wake = wake;
    const storage = event => {
      if (![null, "token", "user"].includes(event.key)) return;
      if (event.key === "token" && event.newValue === token) return;
      if (event.key === "user" && event.newValue) {
        try { const value = JSON.parse(event.newValue); if (`${value.userType}:${value._id || value.id}` === actor) return; } catch { /* Invalid session clears the feed. */ }
      }
      record.controller.abort(); clearTimeout(record.timer);
      setResult({ ...empty, scope, status: "error", feedback: "Session changed. Sign in again." });
    };
    document.addEventListener("visibilitychange", wake);
    for (const event of ["focus", "online", "offline"]) window.addEventListener(event, wake);
    window.addEventListener("storage", storage);
    wake();
    return () => {
      clearTimeout(record.timer); record.controller.abort();
      document.removeEventListener("visibilitychange", wake);
      for (const event of ["focus", "online", "offline"]) window.removeEventListener(event, wake);
      window.removeEventListener("storage", storage);
    };
  }, [scope, actor, token]);
  useEffect(() => { if (open) session.current?.wake?.(); }, [open]);
  useEffect(() => { setOpen(false); }, [scope, pathname]);

  const loadOlder = async event => {
    const target = event.currentTarget, record = session.current;
    if (target.scrollHeight - target.scrollTop - target.clientHeight > 80 || !state.next || state.more || state.pending || !active(record) || record.busy) return;
    record.busy = true;
    const version = record.version, cursor = state.next;
    setResult(previous => ({ ...previous, more: true }));
    try {
      const data = await record.request("", { params: { limit: 20, before: cursor } });
      if (!active(record) || record.version !== version) return;
      if (!validFeed(data) || !data.enabled || data.pagination.nextCursor === cursor) throw new Error();
      setResult(previous => ({ ...previous, items: ordered([...previous.items, ...data.items]), total: data.unreadTotal,
        next: data.pagination.nextCursor, more: false, feedback: "" }));
    } catch (error) {
      if (active(record) && record.version === version) {
        if (error.response?.status === 401) {
          record.expired = true;
          setResult({ ...empty, scope, status: "error", feedback: "Your session has expired. Sign in again." });
          return;
        }
        setResult(previous => ({ ...previous, more: false, feedback: "Unable to load older notifications. Scroll to retry." }));
      }
    } finally { record.busy = false; }
  };

  const mark = async (ids, destination) => {
    const record = session.current;
    if (!active(record) || record.mutating || record.expired) return;
    record.mutating = true; record.version++;
    record.requests.forEach(controller => controller.abort());
    setResult(previous => ({ ...previous, pending: true, more: false, feedback: "" }));
    try {
      for (let offset = 0; offset < ids.length; offset += 50) {
        const batch = ids.slice(offset, offset + 50);
        const data = await record.request(destination ? `/${ids[0]}/read` : "/read-displayed", { method: "POST", data: { ids: batch }, timeout: 5000 });
        if (!active(record)) return;
        if (!data.success || !Number.isSafeInteger(data.unreadTotal) || data.unreadTotal < 0) throw new Error();
        // Preserve confirmed earlier batches if a later request fails. Never
        // pretend their persistent acknowledgements were rolled back.
        setResult(previous => ({ ...previous, items: previous.items.map(row => batch.includes(row.id) ? { ...row, read: true } : row), total: data.unreadTotal }));
      }
    } catch (error) {
      if (active(record)) {
        if (error.response?.status === 401) {
          record.expired = true;
          setResult({ ...empty, scope, status: "error", feedback: "Your session has expired. Sign in again." });
        } else setResult(previous => ({ ...previous, feedback: "Unable to mark notifications read. Please try again." }));
        toast({ title: "Notifications", description: "Unable to mark notifications read. You can still open the destination.", variant: "destructive" });
      }
    } finally {
      record.mutating = false;
      if (active(record)) {
        setResult(previous => ({ ...previous, pending: false }));
        record.wake?.();
        if (destination && destinations.has(destination)) { setOpen(false); navigate(destination); }
      }
    }
  };
  const displayed = state.status === "ready" ? state.items.filter(row => !row.read).map(row => row.id) : [];
  const trigger = React.cloneElement(children, {}, <>{children.props.children}{state.status === "ready" && state.total > 0
    ? <span aria-hidden="true" className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" /> : null}</>);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col w-[320px] max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-hidden bg-[#1A1A1E] border-white/10 p-0 mt-2" aria-label="Notifications">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">Notification</h3>
        </div>
        <div className="min-h-0 max-h-[400px] overflow-y-auto" onScroll={loadOlder}>
          {state.status === "loading" && <p className="px-4 py-3 text-gray-400 text-sm" role="status">Loading notifications…</p>}
          {state.status === "disabled" && <p className="px-4 py-3 text-gray-400 text-sm">Notifications are not available yet.</p>}
          {state.feedback && <p className="px-4 py-3 text-red-400 text-sm" role="alert">{state.feedback}</p>}
          {state.status === "ready" && !state.items.length && <p className="px-4 py-3 text-gray-400 text-sm">No notifications yet.</p>}
          {state.status === "ready" && state.items.map(row => <button key={row.id} type="button" disabled={state.pending}
            onClick={() => row.read ? (setOpen(false), navigate(row.destination)) : mark([row.id], row.destination)}
            className="block w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/5 focus-visible:outline focus-visible:outline-blue-400 disabled:opacity-50">
            <p className={`text-white text-sm ${row.read ? "" : "font-semibold"}`}>{row.text}</p>
            <time className="text-gray-400 text-xs" dateTime={row.occurredAt || row.createdAt}>{readable(row.occurredAt || row.createdAt)}</time>
          </button>)}
          {state.more && <p role="status" className="px-4 py-3 text-sm text-gray-400">Loading older notifications…</p>}
        </div>
        {state.status === "ready" && <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#1A1A1E]">
          <button type="button" title="Mark all loaded notifications as read." aria-label="Mark all loaded notifications as read."
            disabled={state.pending || !displayed.length} onClick={() => mark([...displayed])}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">Mark all</button>
        </div>}
      </PopoverContent>
    </Popover>
  );
};
export default NotificationPop;
