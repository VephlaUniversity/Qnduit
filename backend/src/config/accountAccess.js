// Narrow method/path exceptions only. Authentication and role/owner checks still
// run on every request, including suspended accounts. Never include admin routes.
export function allowsSuspendedAccess(method, pathname) {
  const path = pathname.split("?")[0].replace(/\/$/, "");
  return method === "GET" && ["/api/auth/session", "/api/support/tickets/mine"].includes(path)
    || method === "POST" && (path === "/api/support/tickets" || /^\/api\/support\/tickets\/[a-f\d]{24}\/replies$/i.test(path));
}
