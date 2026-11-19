import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";

const empty = { code: "", quote: null, pending: false, error: "", notice: "" };
const noPrice = { status: "loading" };
export const formatCheckoutUsd = minor => `$${(minor / 100).toFixed(2)}`;
const cents = value => Number.isSafeInteger(value) && value >= 0;

export function useCheckoutDiscount({ role, plan, previewToken, firstEmployerPurchase = false, initialCode, enabled = true }) {
  const { user } = useAuth();
  const actor = user?.userType === role ? `${role}:${user.id || user._id}` : null;
  const token = actor && browserSessions().find(owner => owner.actor === actor)?.token;
  const scope = useMemo(() => ({ actor, token, plan, previewToken, enabled, firstEmployerPurchase }), [actor, token, plan, previewToken, enabled, firstEmployerPurchase]);
  const available = Boolean(enabled && token && plan);
  const [form, setForm] = useState(empty);
  const [base, setBase] = useState(null);
  const request = useRef(null);
  const applied = useRef(null);
  const currentOwner = useCallback(() => browserSessions().some(owner => owner.actor === actor && owner.token === token), [actor, token]);
  const state = form.scope === scope ? form : empty;
  const price = base?.scope === scope ? base : noPrice;

  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    axios.get(`${API_BASE_URL}/api/payments/checkout-price`, {
      params: { plan }, signal: controller.signal, timeout: 15000, qnduitBoundedRead: true,
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const result = data?.price;
      if (data?.success !== true || result?.plan !== plan || result.currency !== "USD" ||
          !cents(result.originalMinor) || result.originalMinor === 0) throw Error("Invalid checkout price.");
      setBase({ scope, status: "ready", amount: result.originalMinor });
    }).catch(error => {
      if (!controller.signal.aborted) {
        setBase({ scope, status: "error", error: friendlyError(error, "Could not load the price. Reload to try again.") });
      }
    });
    return () => {
      controller.abort();
      if (request.current?.scope === scope) {
        request.current.controller.abort();
        request.current = null;
      }
    };
  }, [scope, available, plan, token]);

  function clear(code, notice = "") {
    request.current?.controller.abort();
    request.current = null;
    applied.current = null;
    setForm({ ...empty, scope, code, notice });
  }

  const requestQuote = useCallback(async rawCode => {
    if (!available || !currentOwner() || request.current?.scope === scope || applied.current === scope) return;
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,64}$/.test(code)) {
      setForm({ ...empty, scope, code: rawCode, error: "Enter a valid discount code." });
      return;
    }
    const controller = new AbortController();
    const attempt = { scope, controller };
    request.current = attempt;
    setForm({ ...empty, scope, code, pending: true });
    const current = () => request.current === attempt && !controller.signal.aborted && currentOwner();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/payments/discount-quote`,
        { code, plan, ...(previewToken ? { previewToken } : {}), ...(firstEmployerPurchase ? { firstEmployerPurchase: true } : {}) },
        { signal: controller.signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` } });
      if (!current()) return;
      const quote = data?.quote;
      if (data?.success !== true || data.quoteOnly !== true || quote?.code !== code || quote.plan !== plan ||
          quote.currency !== "USD" || ![quote.originalMinor, quote.discountMinor, quote.payableMinor].every(cents) ||
          quote.originalMinor === 0 || quote.originalMinor - quote.discountMinor !== quote.payableMinor) {
        throw Error("Invalid discount quote.");
      }
      applied.current = scope;
      setForm({ ...empty, scope, code, quote, firstEmployerOffer: data.firstEmployerPurchase === true, notice: "Discount applied to this quote. No use is reserved." });
    } catch (error) {
      if (current()) setForm({ ...empty, scope, code, error: friendlyError(error, "Could not check the code. Try again.") });
    } finally {
      if (request.current === attempt) request.current = null;
    }
  }, [available, currentOwner, firstEmployerPurchase, plan, previewToken, scope, token]);

  useEffect(() => {
    if (typeof initialCode === "string" && initialCode && available) void requestQuote(initialCode);
  }, [available, initialCode, requestQuote]);

  return {
    ...state, available, price, apply: event => { event.preventDefault(); void requestQuote(state.code); }, owner: token ? { actor, token } : null,
    change: code => clear(code),
    remove: () => clear("", "Discount removed."),
    paymentBlocked: state.pending || Boolean(state.quote),
    canPay: () => currentOwner() && price.status === "ready" && request.current?.scope !== scope && applied.current !== scope,
  };
}
