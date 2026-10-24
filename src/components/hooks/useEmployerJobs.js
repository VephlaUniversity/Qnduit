import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { startMessagePolling } from "../utils/messagePolling";

// One owner-scoped lifecycle for initial fetch, refresh and deletion.
export function useEmployerJobs() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const id = user?.id || user?._id;
  const key = user?.userType === "employer" && id && token ? `${id}:${token}` : "";
  const [snapshot, setSnapshot] = useState({ key: "", jobs: [] });
  const session = useRef(null);

  useEffect(() => {
    if (!key) return;
    const current = { key, active: true, deleted: new Set(), deletes: new Map() };
    session.current = current;
    const valid = () => current.active && localStorage.getItem("token") === token;
    const clear = () => {
      current.active = false;
      loop.stop();
      current.deletes.forEach(controller => controller.abort());
      setSnapshot({ key: "", jobs: [] });
    };
    current.invalidate = clear;
    const loop = startMessagePolling({
      intervalMs: 15000,
      maxDelayMs: 60000,
      async run(signal) {
        if (!valid()) { clear(); return false; }
        const { data } = await axios.get(`${API_BASE_URL}/api/jobs/my-jobs`, {
          signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
        });
        if (!valid() || signal.aborted) return false;
        if (!data.success || !Array.isArray(data.jobs)) throw new Error("Invalid job response");
        setSnapshot({ key, jobs: data.jobs.filter(job => !current.deleted.has(job._id)) });
      },
      onSuccess() {},
      onError() { console.error("Unable to refresh jobs. Retrying automatically."); },
      onUnauthorized: clear,
    });
    const storage = event => {
      if (event.key === "token" && event.newValue !== token || event.key === null) clear();
      if (event.key === "user") {
        try {
          const stored = JSON.parse(event.newValue);
          if (stored?.userType !== "employer" || String(stored.id || stored._id) !== String(id)) clear();
        } catch { clear(); }
      }
    };
    window.addEventListener("storage", storage);
    loop.wake();
    return () => {
      current.active = false;
      loop.stop();
      current.deletes.forEach(controller => controller.abort());
      window.removeEventListener("storage", storage);
    };
  }, [key, token, id]);

  const deleteJob = async jobId => {
    const current = session.current;
    if (!key || !current?.active || current.key !== key || current.deletes.has(jobId)) return;
    const controller = new AbortController();
    current.deletes.set(jobId, controller);
    try {
      await axios.delete(`${API_BASE_URL}/api/jobs/delete/${jobId}`, {
        signal: controller.signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
      });
      if (!current.active || controller.signal.aborted || localStorage.getItem("token") !== token) return;
      current.deleted.add(jobId);
      setSnapshot(previous => previous.key === key
        ? { key, jobs: previous.jobs.filter(job => job._id !== jobId) } : previous);
    } catch (error) {
      if (!controller.signal.aborted && current.active) console.error("Unable to delete job.");
      if (error.response?.status === 401 && current.active) {
        current.invalidate();
      }
    } finally {
      current.deletes.delete(jobId);
    }
  };
  const loaded = Boolean(key && snapshot.key === key);
  return { jobs: loaded ? snapshot.jobs : [], deleteJob, loaded };
}
