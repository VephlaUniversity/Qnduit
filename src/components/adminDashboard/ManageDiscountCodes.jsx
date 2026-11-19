import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import { API_BASE_URL } from "../utils/api";
import { formatAdminProfileDate } from "../utils/adminProfile";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";
import CreateDiscountCode from "./CreateDiscountCode";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "code-asc", label: "Code (A–Z)" },
];
const columns = ["Code", "Discount", "Eligible plans", "Validity (UTC)", "Maximum total uses", "Status"];
const planLabels = {
  "talent:public": "Talent Public", "employer:bronze": "Employer Bronze",
  "employer:silver": "Employer Silver", "employer:platinum": "Employer Platinum",
};
const integer = new Intl.NumberFormat("en-US");
const percentage = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const readAdmin = () => browserSessions().find(session => session.actor.startsWith("admin:"));

function formatDiscount(terms) {
  if (terms.type === "percentage") return percentage.format(terms.basisPoints / 100) + "%";
  const cents = String(terms.amountMinor).padStart(3, "0");
  return `USD ${integer.format(Number(cents.slice(0, -2)))}.${cents.slice(-2)}`;
}

const count = value => value === null ? "Unavailable" : integer.format(value);

function currencyValues(values) {
  return values.map(({ currency, amountMinor }) => {
    const cents = BigInt(amountMinor);
    return `${currency} ${integer.format(cents / 100n)}.${String(cents % 100n).padStart(2, "0")}`;
  }).join(", ") || "0";
}

function usageItems(usage) {
  return [
    ["Successful uses", count(usage.successfulUses)],
    ["Discount value", currencyValues(usage.discountValue)],
    ["Held capacity", count(usage.heldCapacity)],
  ];
}

function UsageOverview({ overview }) {
  const metrics = [
    ["Total codes", count(overview.totalCodes)],
    ["Active codes", count(overview.activeCodes)],
    ["Inactive codes", count(overview.inactiveCodes)],
    ...usageItems(overview),
    ["Remaining capped capacity", count(overview.cappedRemainingCapacity)],
  ];
  return <section aria-label="Discount usage overview" className="mb-4 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 md:p-6">
    <h2 className="mb-3 text-lg font-semibold">Usage overview</h2>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {metrics.map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="text-sm text-gray-400">{label}</dt>
        <dd className="break-words font-semibold">{value}</dd>
      </div>)}
    </dl>
    {overview.uncappedCodes > 0 && <p className="mt-3 text-sm text-yellow-200">
      Limit not set for {integer.format(overview.uncappedCodes)} {overview.uncappedCodes === 1 ? "code" : "codes"}. Set a limit in Edit.
    </p>}
    {overview.inconsistentCodes > 0 && <p className="mt-3 text-sm text-yellow-200">
      Check accounting for {integer.format(overview.inconsistentCodes)} {overview.inconsistentCodes === 1 ? "code" : "codes"}.
    </p>}
  </section>;
}

function discountCells(row) {
  return [
    <span className="font-semibold text-white">{row.code}</span>,
    formatDiscount(row.terms),
    row.eligiblePlans.map(plan => planLabels[plan] || plan).join(", "),
    <>
      <p>Starts {formatAdminProfileDate(row.startsAt, { dateOnly: true })}</p>
      <p>Expires {formatAdminProfileDate(row.expiresAt, { dateOnly: true })}</p>
    </>,
    row.usage.uncapped ? "Limit not set" : integer.format(row.maxTotalUses),
    <span className={`rounded-full px-2 py-1 text-xs ${row.active ? "bg-emerald-600/15 text-emerald-300" : "bg-white/10 text-gray-300"}`}>
      {row.active ? "Active" : "Inactive"}
    </span>,
  ];
}

function DiscountRows({ rows, onEdit, editPending }) {
  const records = rows.map(row => ({ code: row.code, cells: discountCells(row) }));
  const editButton = code => <Button type="button" variant="outline" aria-label={`Edit ${code}`}
    disabled={editPending} className="min-h-11 border-white/20 bg-transparent text-white" onClick={() => onEdit(code)}>Edit</Button>;
  return <>
    <table aria-label="Saved discount codes" className="hidden w-full table-fixed text-left text-sm lg:table">
      <thead className="border-b border-white/10 text-xs text-gray-400">
        <tr>{[...columns, "Actions"].map(label => <th key={label} scope="col" className="pb-3 pr-3 font-medium">{label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {records.map(({ code, cells }) => <tr key={code}>
          <th scope="row" className="break-words py-4 pr-3 align-top">{cells[0]}</th>
          {cells.slice(1).map((cell, index) => <td key={columns[index + 1]} className="break-words py-4 pr-3 align-top text-gray-300">{cell}</td>)}
          <td className="py-4 align-top">{editButton(code)}</td>
        </tr>)}
      </tbody>
    </table>
    <ul aria-label="Saved discount codes" className="divide-y divide-white/10 lg:hidden">
      {records.map(({ code, cells }) => <li key={code} className="py-4 first:pt-0">
        <h2 className="mb-3 break-words">{cells[0]}</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {cells.slice(1).map((cell, index) => <div key={columns[index + 1]} className="min-w-0">
            <dt className="mb-1 text-xs text-gray-400">{columns[index + 1]}</dt>
            <dd className="break-words text-gray-300">{cell}</dd>
          </div>)}
        </dl>
        <div className="mt-3">{editButton(code)}</div>
      </li>)}
    </ul>
  </>;
}

function readCodes(params, signal, owner) {
  return axios.get(`${API_BASE_URL}/api/admin/discount-codes`, {
    params, signal, timeout: 15_000, qnduitBoundedRead: true,
    headers: { Authorization: `Bearer ${owner.token}` },
  });
}

function isCurrent(owner, signal) {
  const current = readAdmin();
  return !signal.aborted && current?.actor === owner.actor && current.token === owner.token;
}

export default function ManageDiscountCodes() {
  const [params, setParams] = useSearchParams();
  const editCode = params.get("edit");
  const editing = editCode !== null;
  const creating = !editing && params.get("create") === "1";
  const showingForm = creating || editing;
  const view = editing ? `edit:${editCode}` : creating ? "create" : "list";
  const search = (params.get("search") || "").slice(0, 64);
  const requestedSort = params.get("sort");
  const sort = sortOptions.some(option => option.value === requestedSort) ? requestedSort : "newest";
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10_000 ? requestedPage : 1;
  const [list, setList] = useState({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [confirmed, setConfirmed] = useState(null);
  const [uncertain, setUncertain] = useState("");
  const [lookup, setLookup] = useState(null);
  const createHeading = useRef(null);
  const listHeading = useRef(null);
  const createButton = useRef(null);
  const editHeading = useRef(null);
  const previousView = useRef(null);
  const handledConfirmation = useRef(null);
  const [editor, setEditor] = useState(null);
  const [editLoad, setEditLoad] = useState(null);
  const [editVersion, setEditVersion] = useState(0);
  const [editPending, setEditPending] = useState(false);
  const [unconfirmedEdits, setUnconfirmedEdits] = useState(() => new Set());
  const editKey = `${editCode}:${editVersion}`;
  const visibleEdit = editing && editor?.record.code === editCode;
  const savedEditError = editing && editLoad?.key === editKey && editLoad.status === "error" ? editLoad.message : "";
  const loadingSaved = editing && editor?.key !== editKey && !savedEditError;
  const editorUnconfirmed = Boolean(editor && unconfirmedEdits.has(`${editor.record.code}:${editor.record.revision}`));

  function updateParams(changes, { replace = true } = {}) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace });
  }

  useEffect(() => {
    if (previousView.current === view) return;
    const focus = editing ? editHeading.current : creating ? createHeading.current
      : previousView.current === null ? listHeading.current : createButton.current;
    previousView.current = view;
    focus?.focus();
  }, [creating, editing, view]);

  useEffect(() => {
    if (visibleEdit) editHeading.current?.focus();
  }, [visibleEdit, editor]);

  useEffect(() => {
    if (!confirmed || handledConfirmation.current === confirmed) return;
    handledConfirmation.current = confirmed;
    if ((creating && confirmed.kind === "created") || (editing && confirmed.kind === "updated" && confirmed.code === editCode)) {
      const next = new URLSearchParams(params);
      next.delete("create");
      next.delete("edit");
      setParams(next, { replace: true });
    }
  }, [confirmed, creating, editing, editCode, params, setParams]);

  useEffect(() => {
    if (!editing || editPending || editor?.key === editKey) return;
    const owner = readAdmin();
    if (!owner || !/^[A-Z0-9_-]{1,64}$/.test(editCode)) {
      setEditLoad({ key: editKey, status: "error", message: "Select a saved discount code to edit." });
      return;
    }
    const controller = new AbortController();
    setEditLoad({ key: editKey, status: "loading" });
    async function load() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/discount-codes/${encodeURIComponent(editCode)}`, {
          headers: { Authorization: `Bearer ${owner.token}` }, signal: controller.signal,
          timeout: 15_000, qnduitBoundedRead: true,
        });
        if (!isCurrent(owner, controller.signal)) return;
        const row = data?.discountCode;
        if (data?.success !== true || row?.code !== editCode || !Number.isSafeInteger(row.revision) || row.revision < 0 ||
            !["fixed", "percentage"].includes(row.terms?.type) || !Array.isArray(row.eligiblePlans) ||
            typeof row.startsAt !== "string" || typeof row.expiresAt !== "string") {
          throw new Error("Invalid discount code details.");
        }
        setEditor({ key: editKey, record: row });
      } catch (error) {
        if (isCurrent(owner, controller.signal)) {
          setEditLoad({ key: editKey, status: "error", message: friendlyError(error, "Discount code details could not be loaded.") });
        }
      }
    }
    load();
    return () => controller.abort();
  }, [editing, editPending, editCode, editKey, editor?.key]);

  useEffect(() => {
    if (showingForm) return;
    const owner = readAdmin();
    if (!owner) {
      setList({ status: "error", message: "Sign in with an Admin account to view discount codes." });
      return;
    }

    setList({ status: "loading" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await readCodes({ search, sort, page, limit: 10 }, controller.signal, owner);
        if (!isCurrent(owner, controller.signal)) return;
        if (data?.success !== true || !Array.isArray(data.data) || !Number.isSafeInteger(data.pagination?.page)
            || !Number.isSafeInteger(data.pagination?.totalPages) || !data.overview) throw new Error("Invalid discount code list response.");
        setList({ status: "ready", rows: data.data, pagination: data.pagination, overview: data.overview });
      } catch (error) {
        if (isCurrent(owner, controller.signal)) {
          setList({ status: "error", message: friendlyError(error, "Discount codes could not be loaded.") });
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [showingForm, search, sort, page, reload, confirmed]);

  useEffect(() => {
    if (lookup?.status !== "loading") return;
    const owner = readAdmin();
    const errorMessage = "Saved codes could not be checked. Creation remains unconfirmed.";
    if (!owner) {
      setLookup({ code: lookup.code, status: "error", message: errorMessage });
      return;
    }
    const controller = new AbortController();
    const code = lookup.code;
    async function check() {
      try {
        const { data } = await readCodes({ code }, controller.signal, owner);
        if (!isCurrent(owner, controller.signal)) return;
        if (data?.success !== true || !Array.isArray(data.data)) throw new Error("Invalid discount code lookup response.");
        const found = data.data.some(row => row.code === code);
        setLookup({
          code, status: "ready",
          message: found ? `${code} exists in saved codes. The original submission remains unconfirmed.`
            : `${code} was not found. The original submission remains unconfirmed.`,
        });
        if (found) setReload(value => value + 1);
      } catch {
        if (isCurrent(owner, controller.signal)) setLookup({ code, status: "error", message: errorMessage });
      }
    }
    check();
    return () => controller.abort();
  }, [lookup]);

  const uncertainNotice = uncertain && <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
    <p className="break-words">Creation of {uncertain} could not be confirmed.</p>
    <Button type="button" variant="outline" className="mt-2 min-h-11 border-white/20 bg-transparent text-white"
      disabled={lookup?.code === uncertain && lookup.status === "loading"}
      onClick={() => setLookup({ code: uncertain, status: "loading" })}>Check saved codes</Button>
    <p role="status" className="mt-2 break-words">{lookup?.code === uncertain && (lookup.status === "loading" ? "Checking saved codes…" : lookup.message)}</p>
  </div>;

  return <>
    <div hidden={showingForm} className="min-w-0 p-4 text-white md:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="h-8 w-1 rounded-full bg-blue-600" />
          <h1 ref={listHeading} tabIndex={-1} className="text-2xl font-semibold md:text-3xl">Discount Codes</h1>
        </div>
        <Button ref={createButton} type="button" className="min-h-11 bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => updateParams({ create: "1", edit: null }, { replace: false })}>
          <Plus aria-hidden="true" />Create discount code
        </Button>
      </div>
      <p role="status" className="mb-4 break-words text-sm text-green-300">{confirmed && `Discount code ${confirmed.code} was ${confirmed.kind}.`}</p>
      {!showingForm && uncertainNotice}
      {!showingForm && editorUnconfirmed &&
        <p role="alert" className="mb-4 break-words text-sm text-yellow-200">The update to {editor.record.code} could not be confirmed.</p>}
      {list.status === "ready" && <UsageOverview overview={list.overview} />}
      <section aria-label="Discount code list" className="min-w-0 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 md:p-6">
        <ListToolbar search={search} searchLabel="Search discount codes" placeholder="Search by code"
          onSearchChange={value => updateParams({ search: value.slice(0, 64), page: null })}
          sortOptions={sortOptions} sortValue={sort} onSortChange={value => updateParams({ sort: value, page: null })} />
        {list.status === "loading" && <p role="status" className="py-8 text-center text-sm text-gray-300">Loading discount codes…</p>}
        {list.status === "error" && <div className="space-y-3">
          <p role="alert" className="text-sm text-red-400">{list.message}</p>
          <Button type="button" variant="outline" className="min-h-11 border-white/20 bg-transparent text-white"
            onClick={() => setReload(value => value + 1)}>Refresh discount codes</Button>
        </div>}
        {list.status === "ready" && (list.rows.length ? <>
          <DiscountRows rows={list.rows} editPending={editPending}
            onEdit={code => updateParams({ edit: code, create: null }, { replace: false })} />
          {list.pagination.totalPages > 1 && <PaginationBar compact page={list.pagination.page}
            totalPages={list.pagination.totalPages} onChange={value => updateParams({ page: value })} />}
        </> : <p className="py-8 text-center text-sm text-gray-300">{search.trim() ? "No discount codes match your search." : "No discount codes have been created."}</p>)}
      </section>
    </div>
    {/* Keep the form mounted while the list is visible so navigation preserves the draft and the request lock. */}
    <div hidden={!creating}>
      <div className="px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          <Button type="button" variant="outline" className="mb-2 min-h-11 border-white/20 bg-transparent text-white"
            onClick={() => updateParams({ create: null })}>Cancel</Button>
          {creating && uncertainNotice}
        </div>
      </div>
      <CreateDiscountCode headingRef={createHeading} onCreated={code => setConfirmed({ code, kind: "created" })} onUnconfirmed={setUncertain} />
    </div>
    <div hidden={!editing}>
      <div className="px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-4xl space-y-3">
          {!visibleEdit && editing && <div className="flex items-center gap-3 text-white">
            <div aria-hidden="true" className="h-8 w-1 rounded-full bg-blue-600" />
            <h1 ref={editHeading} tabIndex={-1} className="text-2xl font-semibold md:text-3xl">Edit discount code</h1>
          </div>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11 border-white/20 bg-transparent text-white"
              disabled={editPending} onClick={() => updateParams({ edit: null, create: null })}>Cancel</Button>
            {(visibleEdit || savedEditError) && <Button type="button" variant="outline"
              className="min-h-11 border-white/20 bg-transparent text-white" disabled={editPending || loadingSaved}
              aria-describedby={visibleEdit ? "discount-reload-help" : undefined}
              onClick={() => setEditVersion(version => version + 1)}>Load saved version</Button>}
          </div>
          {visibleEdit && <p id="discount-reload-help" className="text-xs text-gray-400">Loading the saved version replaces the draft.</p>}
          {editing && !savedEditError && (!visibleEdit || loadingSaved) && <p role="status" className="text-sm text-gray-300">Loading discount code…</p>}
          {savedEditError && <p role="alert" className="text-sm text-red-400">{savedEditError}</p>}
        </div>
      </div>
      {editor && <div hidden={!visibleEdit}>
        <CreateDiscountCode key={`${editor.key}:${editor.record.revision}`} headingRef={editHeading} discount={editor.record}
          loadingSaved={loadingSaved} editUnconfirmed={editorUnconfirmed} onEditPending={setEditPending}
          onUnconfirmedEdit={row => setUnconfirmedEdits(previous => new Set([...previous, `${row.code}:${row.revision}`]))}
          onUpdated={record => {
            setEditor(previous => ({ ...previous, record }));
            setConfirmed({ code: record.code, kind: "updated" });
          }} />
      </div>}
    </div>
  </>;
}
