import axios from "axios";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";

const changeEvent = "qnduit:discount-payment-changed";
const subscribe = callback => {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
};
const amounts = ["originalMinor", "discountMinor", "payableMinor"];
const samePrice = (left, right) => left.currency === right.currency && amounts.every(key => left[key] === right[key]);

function validTerms(terms, entry) {
  return terms?.code === entry.code && terms.plan === entry.plan && terms.currency === "USD" &&
    amounts.every(key => Number.isSafeInteger(terms[key]) && terms[key] >= 0) && terms.originalMinor > 0 &&
    terms.originalMinor - terms.discountMinor === terms.payableMinor;
}

function validAttempt(attempt, entry) {
  return validTerms(attempt, entry) && /^[a-f0-9]{64}$/.test(attempt.checkoutAttemptId || "") &&
    (!entry.attemptId || attempt.checkoutAttemptId === entry.attemptId);
}

function openHosted(url) {
  const target = new URL(url);
  const localFake = import.meta.env.DEV && window.location.hostname === "127.0.0.1" &&
    new URL(API_BASE_URL).hostname === "127.0.0.1" && target.protocol === "http:" && target.hostname === "127.0.0.1" &&
    /^\/hosted\/QND-DISCOUNT-[a-f0-9]{64}$/.test(target.pathname) && !target.search && !target.hash;
  if ((!localFake && target.origin !== "https://checkout.flutterwave.com") || target.username || target.password) {
    throw Error("The checkout link could not be confirmed.");
  }
  window.location.assign(target.href);
}

const rejectedReservation = (error) => {
  const code = error.response?.data?.code;
  return (error.response?.status === 400 || error.response?.status === 403 || error.response?.status === 404 || error.response?.status === 409) &&
    /^(DISCOUNT_CODE_|DISCOUNT_FIRST_EMPLOYER_PURCHASE_|DISCOUNT_CAPACITY_UNAVAILABLE$|DISCOUNT_ACCOUNT_ALREADY_OCCUPIED$|DISCOUNT_QUOTE_|SUBSCRIPTION_ALREADY_ACTIVE$|SUBSCRIPTION_CHECKOUT_DENIED$)/.test(code || "");
};

export function useDiscountPayment(owner, plan, firstEmployerPurchase = false) {
  const key = owner ? `qnduit:discount-payment:${owner.actor}` : null;
  const token = owner?.token;
  const read = useCallback(() => {
    try { return key ? localStorage.getItem(key) : null; }
    catch { return null; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, read);
  let entry;
  try { entry = raw && JSON.parse(raw); } catch { /* Unreadable data must not enable payment. */ }
  const [view, setView] = useState({});
  const [busy, setBusy] = useState(false);
  const request = useRef(null);
  const mounted = useRef(false);
  const activePlan = useRef(plan);
  useLayoutEffect(() => { activePlan.current = plan; }, [plan]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const belongs = useCallback(() => Boolean(mounted.current && key && browserSessions().some(session =>
    `qnduit:discount-payment:${session.actor}` === key && session.token === token)), [key, token]);

  const store = useCallback(value => {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    window.dispatchEvent(new Event(changeEvent));
  }, [key]);

  const call = useCallback(async (path, options) => (await axios({
    url: `${API_BASE_URL}/api/payments/${path}`, timeout: 20000,
    headers: { Authorization: `Bearer ${token}` }, ...options,
  })).data, [token]);

  const check = useCallback(async (saved, signal) => {
    try {
      const { success, attempt } = await call("discount-checkout", { params: { idempotencyKey: saved.idempotencyKey }, signal });
      if (signal?.aborted || !belongs()) return;
      if (success !== true || !validAttempt(attempt, saved)) throw Error("Invalid checkout status.");
      if (attempt.status === "released") {
        store(null);
        setView({ key, message: "The reservation was released. Apply a code to try again." });
        return;
      }
      const current = { ...saved, attemptId: attempt.checkoutAttemptId };
      if (saved.attemptId !== current.attemptId) store(current);
      setView({ key, id: saved.idempotencyKey, attempt, phase: attempt.status === "redeemed" ? "redeemed"
        : attempt.initializationState === "ready" ? "ready" : attempt.initializationState === "not_started" ? "confirm" : "unknown",
        message: attempt.message });
    } catch (error) {
      if (signal?.aborted || !belongs()) return;
      const notFound = error.response?.status === 404 && error.response?.data?.code === "DISCOUNT_ATTEMPT_NOT_FOUND";
      setView({ key, id: saved.idempotencyKey, phase: notFound && !saved.attemptId ? "retry_reserve" : "unknown",
        message: notFound && !saved.attemptId ? "No reservation was found. You can retry the same reservation." :
          friendlyError(error, "Checkout status is unresolved. Check the same attempt again.") });
    }
  }, [belongs, call, key, store]);

  // Initial navigation and reload only read status. The same persisted key also
  // protects reservation retries if the first response was lost before returning an ID.
  useEffect(() => {
    const controller = new AbortController();
    if (raw && !request.current) {
      try {
        const saved = JSON.parse(raw);
        if (saved?.idempotencyKey) void check(saved, controller.signal);
      } catch { /* The UI remains locked for unreadable saved data. */ }
    }
    return () => controller.abort();
  }, [raw, check]);

  const show = value => setView({ key, ...value });

  async function initialize(saved, attempt) {
    if (!belongs() || activePlan.current !== saved.plan) return;
    if (attempt.payableMinor === 0) {
      const { success, grant } = await call("discount-checkout/activate-zero", {
        method: "POST", data: { checkoutAttemptId: attempt.checkoutAttemptId },
      });
      if (!belongs()) return;
      if (success !== true || !Number.isFinite(Date.parse(grant?.startsAt)) || !(Date.parse(grant.endsAt) > Date.parse(grant.startsAt))) {
        throw Error("No-charge activation could not be confirmed.");
      }
      show({ id: saved.idempotencyKey, attempt: { ...attempt, grant }, phase: "redeemed" });
      return;
    }
    const result = await call("discount-checkout", { method: "POST", data: { checkoutAttemptId: attempt.checkoutAttemptId } });
    if (!belongs()) return;
    if (result.success !== true || result.initializationState !== "ready" || !validAttempt(result, saved) || !samePrice(result, attempt)) {
      throw Error("Invalid saved checkout.");
    }
    show({ id: saved.idempotencyKey, attempt: result, phase: "ready" });
    if (activePlan.current === saved.plan) openHosted(result.checkoutUrl);
  }

  async function reserve(saved, confirmChanges) {
    let result;
    try {
      result = await call("discount-reservation", { method: "POST", data: {
        code: saved.code, plan: saved.plan, idempotencyKey: saved.idempotencyKey,
        ...(saved.firstEmployerPurchase ? { firstEmployerPurchase: true } : {}),
      } });
    } catch (error) {
      if (belongs() && rejectedReservation(error) && !saved.attemptId) {
        // A replay conflict can describe an already existing slot. Read before
        // abandoning the key so concurrent or ambiguous requests cannot unlock it.
        const code = error.response.data.code;
        if (!confirmChanges && !["DISCOUNT_ACCOUNT_ALREADY_OCCUPIED"].includes(code)) {
          store(null);
          show({ message: friendlyError(error, "The discount is unavailable. Check the code before continuing.") });
          return;
        }
      }
      throw error;
    }
    if (!belongs()) return;
    const attempt = result.reservation;
    if (result.success !== true || result.reservationOnly !== true || !validAttempt(attempt, saved)) throw Error("Invalid reservation.");
    const current = { ...saved, attemptId: attempt.checkoutAttemptId };
    store(current);
    if (result.replayed || attempt.status !== "held") {
      await check(current);
      return;
    }
    if (confirmChanges || !samePrice(saved.quote, attempt) || activePlan.current !== saved.plan) {
      show({ id: saved.idempotencyKey, attempt, phase: "confirm" });
      return;
    }
    await initialize(current, attempt);
  }

  async function run(action) {
    if (!belongs() || request.current) return;
    const work = {};
    request.current = work;
    setBusy(true);
    try {
      if (navigator.locks?.request) await navigator.locks.request(key, action);
      else await action();
    } catch (error) {
      if (belongs()) {
        const saved = JSON.parse(read() || "null");
        setView(previous => ({ ...previous, key, id: saved?.idempotencyKey, phase: "unknown",
          message: friendlyError(error, "Checkout could not be confirmed. Check this attempt before continuing.") }));
      }
    } finally {
      if (request.current === work) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  const status = view.key === key && view.id === entry?.idempotencyKey ? view : {};
  return {
    entry, locked: Boolean(raw), busy, ...status,
    start: quote => run(async () => {
      if (!belongs() || read() || quote?.payableMinor < 0 || quote?.plan !== plan) return;
      const saved = { code: quote.code, plan, quote, firstEmployerPurchase, idempotencyKey: crypto.randomUUID() };
      store(saved); // Fail closed if attempt identity could not be saved.
      show({ id: saved.idempotencyKey, phase: "working" });
      await reserve(saved, false);
    }),
    action: () => run(async () => {
      if (!belongs() || !entry || read() !== raw) return;
      if (status.phase === "ready") {
        await check(entry); // Refresh the ownership, expiry and lifecycle guard before offering a link.
        return;
      }
      if (status.phase === "confirm" && status.attempt?.payableMinor >= 0 && entry.plan === plan) {
        await initialize(entry, status.attempt);
        return;
      }
      if (status.phase === "retry_reserve" && entry.plan === plan) {
        await reserve(entry, true);
        return;
      }
      await check(entry);
    }),
    dismissConfirmed: () => run(async () => {
      if (belongs() && entry && read() === raw && status.phase === "redeemed") store(null);
    }),
    resume: () => run(async () => {
      if (!belongs() || !entry || read() !== raw || entry.plan !== plan || status.phase !== "ready") return;
      const { success, attempt } = await call("discount-checkout", { params: { idempotencyKey: entry.idempotencyKey } });
      if (!belongs()) return;
      if (success !== true || !validAttempt(attempt, entry) || attempt.initializationState !== "ready" ||
          !samePrice(attempt, status.attempt)) {
        await check(entry);
        return;
      }
      if (activePlan.current === entry.plan) openHosted(attempt.checkoutUrl);
    }),
    blocksPayment: () => Boolean(read()) || Boolean(request.current),
  };
}
