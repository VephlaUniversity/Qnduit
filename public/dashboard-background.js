// Run synchronously in the head, before the dashboard can paint.
if (/^\/(?:dashboard|talent-dashboard)(?:\/|$)/.test(window.location.pathname)) {
  document.documentElement.setAttribute("data-dashboard-background", "");
}
