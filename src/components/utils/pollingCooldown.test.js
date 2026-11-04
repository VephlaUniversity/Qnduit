import assert from "node:assert/strict";
import { test } from "node:test";
import axios from "axios";
import { installPollingRateLimits } from "./pollingCooldown.js";

const base = "http://127.0.0.1:5999";
function setup(adapter) {
  let sessions = [{ actor: "talent:1", token: "talent-token" }, { actor: "admin:2", token: "admin-token" }];
  const events = new EventTarget(); events.location = { href: base };
  const client = axios.create({ adapter }); client.CanceledError = axios.CanceledError;
  const stop = installPollingRateLimits(client, { apiBaseUrl: base, events,
    readSession: bearer => sessions.find(row => bearer === `Bearer ${row.token}`),
    channelFactory: () => ({ postMessage() {}, close() {} }),
  });
  return { client, stop, change(value) { sessions = value; events.dispatchEvent(new Event("qnduit:polling-session-changed")); } };
}
const response = config => ({ config, status: 200, headers: {}, data: { actor: config.__pollingContext.actor } });

test("polling selects the Bearer owner when Talent and Admin sessions coexist", async () => {
  const { client, stop } = setup(async config => response(config));
  try {
    const talent = await client.get(base + "/api/applications/my-applications", { headers: { Authorization: "Bearer talent-token" } });
    const admin = await client.get(base + "/api/admin/posted-jobs/external-activities", { headers: { Authorization: "Bearer admin-token" } });
    assert.equal(talent.data.actor, "talent:1"); assert.equal(admin.data.actor, "admin:2");
    await assert.rejects(client.get(base + "/api/admin/posted-jobs/external-activities", { headers: { Authorization: "Bearer stale-token" } }), axios.isCancel);
  } finally { stop(); }
});

test("an Admin switch cancels only the stale Admin request and discards its response", async () => {
  const pending = [];
  let began;
  const started = new Promise(resolve => began = resolve);
  const { client, stop, change } = setup(config => new Promise(resolve => {
    pending.push({ config, resolve }); if (pending.length === 2) began();
  }));
  try {
    const requests = Promise.allSettled([
      client.get(base + "/api/admin/posted-jobs/external-activities", { headers: { Authorization: "Bearer admin-token" } }),
      client.get(base + "/api/applications/my-applications", { headers: { Authorization: "Bearer talent-token" } }),
    ]);
    await started;
    change([{ actor: "talent:1", token: "talent-token" }, { actor: "admin:3", token: "next-admin-token" }]);
    const admin = pending.find(row => row.config.__pollingContext.actor === "admin:2");
    const talent = pending.find(row => row.config.__pollingContext.actor === "talent:1");
    assert.equal(admin.config.signal.aborted, true); assert.equal(talent.config.signal.aborted, false);
    pending.forEach(row => row.resolve(response(row.config)));
    const [oldAdmin, currentTalent] = await requests;
    assert.equal(oldAdmin.status, "rejected"); assert(axios.isCancel(oldAdmin.reason));
    assert.equal(currentTalent.status, "fulfilled"); assert.equal(currentTalent.value.data.actor, "talent:1");
  } finally { stop(); }
});

test("Admin account cooldown defers refresh and account switch cancels the deferred request", async () => {
  let calls = 0;
  const { client, stop, change } = setup(async config => {
    calls++;
    throw Object.assign(new Error("Synthetic cooldown"), { config,
      response: { status: 429, config, headers: { "Retry-After": "60" }, data: { scope: "poll-account" } } });
  });
  try {
    await assert.rejects(client.get(base + "/api/admin/posted-jobs/external-activities", { headers: { Authorization: "Bearer admin-token" } }));
    const deferred = client.get(base + "/api/admin/posted-jobs/external-activities", { headers: { Authorization: "Bearer admin-token" } });
    const rejection = assert.rejects(deferred, axios.isCancel);
    await Promise.resolve(); await Promise.resolve();
    change([{ actor: "talent:1", token: "talent-token" }]);
    await rejection; assert.equal(calls, 1);
  } finally { stop(); }
});
