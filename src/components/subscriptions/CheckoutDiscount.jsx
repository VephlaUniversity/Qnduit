import { useId, useRef } from "react";

import { formatCheckoutUsd } from "../hooks/useCheckoutDiscount";

export default function CheckoutDiscount({ discount, upgrade = false, allowHandoff = false, disabled = false, payment }) {
  const id = useId();
  const input = useRef(null);
  const { code, error, notice, pending, quote, available, price, apply, change, remove } = discount;
  const locked = payment?.locked;
  if (locked && payment.entry?.plan !== payment.plan) return null;
  if (!available) return null;

  const terms = locked ? payment.attempt : quote;
  const rows = terms ? [
    ["Original price", terms.originalMinor], ["Discount", terms.discountMinor], ["Payable total", terms.payableMinor],
  ] : !locked && price.status === "ready" ? [["Total", price.amount]] : [];
  const action = "min-h-11 rounded-lg border border-current px-3 text-sm font-semibold disabled:opacity-50";
  return <div className="space-y-3">
    {!locked && <form onSubmit={apply} className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">Discount code</label>
      <div className="flex flex-wrap gap-2">
        <input id={id} ref={input} value={code} onChange={event => change(event.target.value)} disabled={disabled}
          maxLength={64} autoComplete="off" spellCheck={false} aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-11 min-w-0 flex-1 basis-28 rounded-lg border border-current bg-transparent px-3 text-sm" />
        <button type="submit" className={action} disabled={disabled || pending || Boolean(quote)}>Apply</button>
        {code && <button type="button" className={action} disabled={disabled} onClick={() => { remove(); input.current?.focus(); }}>Remove</button>}
      </div>
    </form>}
    {locked && <p className="text-sm font-semibold">Saved discount code: {payment.entry?.code}</p>}
    {!locked && error && <p id={`${id}-error`} role="alert" className="text-sm">{error}</p>}
    {!locked && <p role="status" className="text-sm">{pending ? "Checking discount code…" : notice}</p>}
    {rows.length > 0 && <dl aria-label="Checkout pricing" className="space-y-1 text-sm">
      {rows.map(([label, minor]) => <div key={label} className="flex flex-wrap justify-between gap-x-2">
        <dt>{label}</dt><dd className="font-semibold">{label === "Discount" && minor > 0 ? "−" : ""}{formatCheckoutUsd(minor)}</dd>
      </div>)}
    </dl>}
    {!locked && price.status === "error" && <p role="alert" className="text-sm">{price.error}</p>}
    {!locked && price.status === "loading" && !quote && <p role="status" className="text-sm">Loading plan price…</p>}
    {!locked && quote && (upgrade || (!payment && !allowHandoff)) && <p className="text-sm font-semibold">{upgrade
      ? "Discounts aren’t available for this upgrade yet. Remove the code to continue."
      : "Discounted checkout is not available here. Remove the code to continue at full price."}</p>}
  </div>;
}
