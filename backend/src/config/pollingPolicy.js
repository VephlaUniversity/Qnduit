// Exact method/path classification is shared by the server and polling client.
// Query strings and pagination never create another allowance.
export const POLLING_ENDPOINTS = Object.freeze([
  ["GET", "/api/auth/session", ["talent", "employer"]],
  ["GET", "/api/messages/unread", ["talent", "employer"]],
  ["POST", "/api/messages/heartbeat", ["talent", "employer"]],
  ["POST", "/api/messages/presence", ["talent", "employer"]],
  ["GET", "/api/messages/chats", ["talent", "employer"]],
  ["GET", "/api/messages", ["talent", "employer"]],
  ["GET", "/api/notifications", ["talent", "employer"]],
  ["GET", "/api/employers/messaging-access", ["employer"]],
  ["GET", "/api/jobs/my-jobs", ["employer"]],
]);

export function pollingRoles(method, pathname) {
  const path = pathname.replace(/\/$/, "");
  return POLLING_ENDPOINTS.find(
    ([verb, route]) => verb === method.toUpperCase() && route === path,
  )?.[2];
}

export const POLLING_BUDGETS = Object.freeze([
  { scope: "poll-ip", windowMs: 60_000, limit: 4_000 },
  { scope: "poll-ip", windowMs: 900_000, limit: 60_000 },
  { scope: "poll-account", windowMs: 60_000, limit: 600 },
  { scope: "poll-account", windowMs: 900_000, limit: 8_000 },
]);
