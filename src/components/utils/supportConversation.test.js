import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSupportTime, supportConversation } from "./supportConversation.js";

test("conversation preserves every message, sorts dates stably and leaves undated legacy entries explicit", () => {
  const ticket = { name: "Synthetic Owner", userType: "talent", message: "Original", createdAt: "2026-11-02T23:30:00Z", replies: [
    { _id: "b", message: "Later user", authorRole: "talent", authorName: "Owner", createdAt: "2026-11-02T23:32:00Z" },
    { _id: "a", message: "Legacy Admin", adminId: "admin", adminName: "Legacy Admin", createdAt: "2026-11-02T23:31:00Z" },
    { _id: "c", message: "Same-time Admin", adminName: "Admin", createdAt: "2026-11-02T23:32:00Z" },
    { message: "Undated legacy", adminName: "Admin" }, { message: "Invalid legacy date", createdAt: "invalid" },
  ] };
  const before = JSON.stringify(ticket);
  const entries = supportConversation(ticket);
  assert.deepEqual(entries.map(row => row.message), ["Original", "Legacy Admin", "Later user", "Same-time Admin", "Undated legacy", "Invalid legacy date"]);
  assert.equal(entries[1].role, "admin"); assert.equal(entries[2].author, "Owner");
  assert.equal(new Set(entries.map(row => row.key)).size, 6);
  assert.equal(JSON.stringify(ticket), before);
  assert.equal(formatSupportTime(ticket.createdAt), "3 Nov 2026, 00:30:00 WAT");
  for (const value of [undefined, null, "", "invalid"]) assert.equal(formatSupportTime(value), "Date/time unavailable");
  assert.equal(supportConversation({ message: "Legacy original only" }).length, 1);
});
