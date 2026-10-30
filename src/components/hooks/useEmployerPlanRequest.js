import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { createEmployerPlanRequestSession } from "../utils/employerPlanRequest";

export function useEmployerPlanRequest() {
  const { user } = useAuth();
  const actor = user?.userType === "employer" ? `employer:${user.id || user._id}` : "";
  const owner = browserSessions().find(row => row.actor === actor), ownerKey = owner ? `${actor}:${owner.token}` : "";
  const session = useMemo(() => createEmployerPlanRequestSession({ client: axios, baseUrl: API_BASE_URL,
    readOwner: () => browserSessions().find(row => `${row.actor}:${row.token}` === ownerKey),
  }), [ownerKey]);
  const [result, setResult] = useState({ status: "loading" });
  const update = value => setResult({ ...value, ownerKey });
  useEffect(() => {
    session.load(value => setResult({ ...value, ownerKey })).catch(() => {});
    return () => session.cancel();
  }, [session, ownerKey]);
  return { upgrade: toPlan => session.upgrade(toPlan, update, url => window.location.assign(url)).catch(() => {}), result: result.ownerKey === ownerKey ? result : { status: "loading" },
    refresh: () => session.load(update).catch(() => {}), send: (toPlan, saved) => session.send(toPlan, update, saved).catch(() => {}) };
}
