// Only list state is accepted; return destinations are always fixed internal routes.
export function employerFollowState(params) {
  const rawPage = params.get("page") || "1";
  const number = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  return {
    tab: params.get("tab") === "following" ? "following" : "followers",
    q: params.get("q") || "",
    page: Number.isSafeInteger(number) && number >= 1 && number <= 100000 ? number : 1,
  };
}
export function employerFollowParams(state) {
  const params = new URLSearchParams();
  if (state.tab === "following") params.set("tab", "following");
  if (state.q) params.set("q", state.q);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}
