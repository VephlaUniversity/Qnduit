import axios from "axios";
import { useEffect, useRef, useState } from "react";
import JobFormSelect from "../jobs/JobFormSelect";
import { Button } from "../ui/button";
import { API_BASE_URL } from "../utils/api";
import { isCalendarDate } from "../utils/jobDeadline";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError, safeText } from "../utils/userMessage";

const inputClass = "block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-white/15 bg-[#0E0E10] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-blue-400 aria-invalid:border-red-400";
const gridClass = "grid min-w-0 gap-5 sm:grid-cols-2";
const planGroups = [
  { role: "Talent", plans: [["talent:public", "Public"]] },
  { role: "Employer", plans: [["employer:bronze", "Bronze"], ["employer:silver", "Silver"], ["employer:platinum", "Platinum"]] },
];
const apiFields = { code: "code", terms: "value", startsOn: "starts", expiresOn: "expires", maxTotalUses: "maximum", eligiblePlans: "plans", active: "status" };
const rejectionStatuses = new Set([400, 401, 403, 404, 409, 413, 415, 422, 429]);
const readAdmin = () => browserSessions().find(session => session.actor.startsWith("admin:"));
const unconfirmedMessage = code => `Creation of ${code} could not be confirmed. It may already exist. Verify its status before submitting that code again.`;
const unconfirmedEditMessage = code => `The update to ${code} could not be confirmed. Load the saved version to compare it with your draft before editing again.`;

function savedDiscountValue(terms) {
  if (!terms) return "";
  if (terms.type === "percentage") return String(terms.basisPoints / 100);
  const cents = String(terms.amountMinor).padStart(3, "0");
  return `${cents.slice(0, -2)}.${cents.slice(-2)}`;
}

function matchesSavedEdit(saved, body) {
  const terms = saved.terms;
  return saved.revision === body.revision + 1 && terms?.type === body.terms.type &&
    (terms.type === "percentage" ? terms.basisPoints === body.terms.basisPoints
      : terms.amountMinor === body.terms.amountMinor && terms.currency === body.terms.currency) &&
    saved.startsAt === body.startsOn + "T00:00:00.000Z" && saved.expiresAt === body.expiresOn + "T00:00:00.000Z" &&
    saved.maxTotalUses === body.maxTotalUses && saved.active === body.active &&
    Array.isArray(saved.eligiblePlans) && saved.eligiblePlans.length === body.eligiblePlans.length &&
    saved.eligiblePlans.every((plan, index) => plan === body.eligiblePlans[index]);
}

function focusFirstError(form, errors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  const field = first === "plans" ? form.querySelector('input[name="plans"]') : form.elements.namedItem(first);
  requestAnimationFrame(() => field?.focus());
}

function DiscountField({ prefix, name, label, hint, error, children }) {
  const id = `${prefix}-${name}`;
  const describedBy = [hint && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ");
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
    {children({ id, name, className: inputClass, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined })}
    {hint && <p id={`${id}-help`} className="mt-2 text-xs text-gray-400">{hint}</p>}
    {error && <p id={`${id}-error`} className="mt-2 text-sm text-red-400">{error}</p>}
  </div>;
}

export default function CreateDiscountCode({ headingRef, onCreated, onUnconfirmed,
  discount, onUpdated, onEditPending, onUnconfirmedEdit, editUnconfirmed = false, loadingSaved = false }) {
  const editing = Boolean(discount);
  const prefix = editing ? "edit-discount" : "discount";
  const [type, setType] = useState(discount?.terms.type ?? "percentage");
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  const unconfirmed = useRef(new Set());
  useEffect(() => () => request.current?.abort(), []);

  async function save(event) {
    event.preventDefault();
    if (request.current || loadingSaved || editUnconfirmed || feedback?.kind === "conflict") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const next = {};
    const rawCode = data.get("code").trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(rawCode)) next.code = "Use 1–64 letters, numbers, hyphens, or underscores.";
    const code = rawCode.toUpperCase();

    const value = data.get("value");
    const [whole, fraction = ""] = value.split(".");
    let amountMinor;
    if (type === "percentage") {
      if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 100) {
        next.value = "Enter a percentage greater than 0 and up to 100, with at most two decimal places.";
      }
    } else {
      if (/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value)) {
        amountMinor = Number(whole + fraction.padEnd(2, "0"));
      }
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        next.value = "Enter a positive USD amount with up to two decimal places, within the supported range.";
      }
    }

    const starts = data.get("starts");
    const expires = data.get("expires");
    if (!isCalendarDate(starts)) next.starts = "Choose a valid start date.";
    if (!isCalendarDate(expires)) next.expires = "Choose a valid expiration date.";
    else if (!next.starts && expires <= starts) {
      next.expires = "Choose an expiration date after the start date.";
    }

    const maximum = data.get("maximum");
    if (!maximum) {
      next.maximum = "Enter a maximum total uses limit.";
    } else if (!/^\d+$/.test(maximum) || !Number.isSafeInteger(Number(maximum)) || Number(maximum) <= 0) {
      next.maximum = "Enter a positive whole number of uses.";
    }
    const eligiblePlans = data.getAll("plans");
    if (!eligiblePlans.length) next.plans = "Select at least one eligible paid plan.";
    setErrors(next);
    if (Object.keys(next).length) {
      setFeedback({ kind: "error", text: "Review the highlighted fields." });
      focusFirstError(form, next);
      return;
    }
    if (unconfirmed.current.has(code)) {
      setFeedback({ kind: "uncertain", text: unconfirmedMessage(code) });
      onUnconfirmed?.(code);
      return;
    }
    const owner = readAdmin();
    if (!owner) {
      setFeedback({ kind: "error", text: editing ? "Sign in with an Admin account to edit a discount code." : "Sign in with an Admin account to create a discount code." });
      return;
    }
    const terms = type === "percentage"
      ? { type, basisPoints: Number(whole) * 100 + Number(fraction.padEnd(2, "0")) }
      : { type, amountMinor, currency: "USD" };
    const body = {
      ...(editing ? { revision: discount.revision } : { code }), terms, startsOn: starts, expiresOn: expires,
      maxTotalUses: Number(maximum), eligiblePlans, active: data.get("status") === "active",
    };
    const controller = new AbortController();
    request.current = controller;
    const current = () => {
      const session = readAdmin();
      return !controller.signal.aborted && session?.actor === owner.actor && session.token === owner.token;
    };
    setPending(true);
    onEditPending?.(true);
    setFeedback(null);
    try {
      const endpoint = `${API_BASE_URL}/api/admin/discount-codes`;
      const response = await axios.request({
        method: editing ? "PATCH" : "POST",
        url: editing ? `${endpoint}/${encodeURIComponent(discount.code)}` : endpoint,
        data: body,
        headers: { Authorization: `Bearer ${owner.token}` },
        signal: controller.signal,
        timeout: 15_000,
      });
      if (!current()) return;
      const saved = response.data?.discountCode;
      if (response.status !== (editing ? 200 : 201) || response.data?.success !== true || saved?.code !== code ||
          (editing && !matchesSavedEdit(saved, body))) {
        throw new Error("The discount code write was not confirmed.");
      }
      if (editing) {
        onUpdated?.(saved);
        return;
      }
      form.reset();
      setType("percentage");
      setFeedback(onCreated ? null : { kind: "success", text: `Discount code ${code} was created.` });
      onCreated?.(code);
    } catch (error) {
      if (!current()) return;
      const status = error.response?.status;
      if (!rejectionStatuses.has(status)) {
        if (editing) {
          setFeedback({ kind: "uncertain", text: unconfirmedEditMessage(code) });
          onUnconfirmedEdit?.(discount);
        } else {
          unconfirmed.current.add(code);
          setFeedback({ kind: "uncertain", text: unconfirmedMessage(code) });
          onUnconfirmed?.(code);
        }
        return;
      }
      const serverErrors = error.response?.data?.errors;
      const fields = {};
      for (const [key, field] of Object.entries(apiFields)) {
        const message = safeText(serverErrors?.[key], "");
        if (message) fields[field] = message;
      }
      if (status === 409 && !editing) fields.code = "This code already exists. Choose a different code.";
      setErrors(fields);
      const fallback = editing ? "The discount code could not be updated." : "The discount code could not be created.";
      setFeedback({ kind: editing && status === 409 ? "conflict" : "error", text: friendlyError(error, fallback) });
      focusFirstError(form, fields);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) {
        setPending(false);
        onEditPending?.(false);
      }
    }
  }

  function clearFeedback(event) {
    const { name } = event.target;
    setFeedback(previous => ["uncertain", "conflict"].includes(previous?.kind) ? previous : null);
    setErrors(previous => {
      const next = { ...previous };
      delete next[name];
      if (name === "starts") delete next.expires;
      if (name === "type") delete next.value;
      return next;
    });
  }

  return <div className="min-w-0 p-4 text-white md:p-6 lg:p-8">
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="h-8 w-1 rounded-full bg-blue-600" />
        <h1 ref={headingRef} tabIndex={-1} className="text-left text-2xl font-semibold md:text-3xl">{editing ? "Edit discount code" : "Create discount code"}</h1>
      </div>
      <form noValidate onSubmit={save} onChange={clearFeedback} className="mt-6 space-y-6 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 sm:p-6">
        <fieldset disabled={pending || loadingSaved} className="min-w-0">
          <legend className="mb-4 text-lg font-semibold">Discount details</legend>
          <div className={gridClass}>
            <DiscountField prefix={prefix} name="code" label="Unique code" hint={editing ? "The saved code cannot be changed." : "Use letters, numbers, hyphens, or underscores. Codes are saved in uppercase."} error={errors.code}>
              {props => <input {...props} required readOnly={editing} defaultValue={discount?.code} autoComplete="off" spellCheck={false} />}
            </DiscountField>
            <DiscountField prefix={prefix} name="type" label="Discount type">
              {props => <JobFormSelect {...props} value={type} onChange={event => setType(event.target.value)}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </JobFormSelect>}
            </DiscountField>
            <DiscountField prefix={prefix} name="value" label={type === "percentage" ? "Percentage (%)" : "Amount (USD)"}
              hint={type === "percentage" ? "Enter 1–100%." : "Enter a dollar amount with up to two decimal places, such as 4.10."}
              error={errors.value}>
              {props => <input key={type} {...props} required inputMode="decimal"
                defaultValue={type === discount?.terms.type ? savedDiscountValue(discount.terms) : undefined} />}
            </DiscountField>
            <DiscountField prefix={prefix} name="status" label="Status" error={errors.status}>
              {props => <JobFormSelect {...props} defaultValue={discount?.active ? "active" : "inactive"}>
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </JobFormSelect>}
            </DiscountField>
          </div>
        </fieldset>

        <fieldset disabled={pending || loadingSaved} className="min-w-0 border-t border-white/10 pt-4">
          <legend className="pr-3 text-lg font-semibold">Dates and limits</legend>
          <div className={gridClass}>
            <DiscountField prefix={prefix} name="starts" label="Start date (UTC)" hint="Starts at 00:00 UTC on this date." error={errors.starts}>
              {props => <input {...props} required type="date" defaultValue={discount?.startsAt.slice(0, 10)} />}
            </DiscountField>
            <DiscountField prefix={prefix} name="expires" label="Expiration date (UTC)" hint="Expires at 00:00 UTC on this date." error={errors.expires}>
              {props => <input {...props} required type="date" defaultValue={discount?.expiresAt.slice(0, 10)} />}
            </DiscountField>
            <DiscountField prefix={prefix} name="maximum" label="Maximum total uses"
              hint={editing && discount.maxTotalUses == null ? "Limit not set. Enter a limit to save changes." : undefined} error={errors.maximum}>
              {props => <input {...props} required inputMode="numeric" defaultValue={discount?.maxTotalUses ?? ""} />}
            </DiscountField>
          </div>
        </fieldset>

        <fieldset disabled={pending || loadingSaved} className="min-w-0 border-t border-white/10 pt-4" aria-describedby={errors.plans ? `${prefix}-plans-error` : undefined}>
          <legend className="pr-3 text-lg font-semibold">Eligible paid plans</legend>
          <div className={gridClass}>
            {planGroups.map(({ role, plans }) => <fieldset key={role} className="min-w-0 rounded-lg border border-white/10 px-3 pb-2">
              <legend className="px-1 text-sm font-medium text-gray-300">{role}</legend>
              {plans.map(([id, label]) => <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" name="plans" id={id === "talent:public" ? `${prefix}-first-plan` : undefined} value={id}
                  defaultChecked={discount?.eligiblePlans.includes(id)}
                  aria-invalid={errors.plans ? true : undefined} aria-describedby={errors.plans ? `${prefix}-plans-error` : undefined}
                  className="size-4 shrink-0 accent-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400" />
                {label}
              </label>)}
            </fieldset>)}
          </div>
          {errors.plans && <p id={`${prefix}-plans-error`} className="mt-2 text-sm text-red-400">{errors.plans}</p>}
        </fieldset>

        <div className="border-t border-white/10 pt-5">
          <p role="status" className="mb-3 text-sm text-green-300">{pending ? (editing ? "Saving discount code…" : "Creating discount code…") : feedback?.kind === "success" ? feedback.text : ""}</p>
          {(editUnconfirmed || (feedback && feedback.kind !== "success")) &&
            <p role="alert" className="mb-3 break-words text-sm text-red-400">{editUnconfirmed ? unconfirmedEditMessage(discount.code) : feedback.text}</p>}
          <Button type="submit" disabled={pending || loadingSaved || editUnconfirmed || feedback?.kind === "conflict"} className="min-h-11 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400">
            {editing ? (pending ? "Saving…" : "Save changes") : (pending ? "Creating…" : "Create discount code")}
          </Button>
        </div>
      </form>
    </div>
  </div>;
}
