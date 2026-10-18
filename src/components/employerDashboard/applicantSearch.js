const statuses = new Set(["all", "pending", "reviewed", "shortlisted", "rejected", "hired"]);

// Scoped keys let the shared list coexist with other dashboard query state.
export function readApplicantSearch(params) {
  const rawPage = params.get("appPage") || "1";
  return {
    query: (params.get("appQ") || "").slice(0, 200),
    status: statuses.has(params.get("appStatus")) ? params.get("appStatus") : "all",
    page: /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1,
  };
}

export function writeApplicantSearch(params, state) {
  const next = new URLSearchParams(params);
  for (const key of ["appQ", "appStatus", "appPage"]) next.delete(key);
  if (state.query) next.set("appQ", state.query.slice(0, 200));
  if (statuses.has(state.status) && state.status !== "all") next.set("appStatus", state.status);
  if (Number.isInteger(state.page) && state.page > 1 && state.page <= 999999) next.set("appPage", String(state.page));
  return next;
}

export function applicantReturnQuery(params) {
  const query = writeApplicantSearch(new URLSearchParams(), readApplicantSearch(params)).toString();
  return query ? `?${query}` : "";
}
