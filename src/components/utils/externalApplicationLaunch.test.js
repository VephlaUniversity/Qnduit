import assert from "node:assert/strict";
import { test } from "node:test";
import {
  externalApplyPath, readExternalApplyTarget, prepareExternalApplyIntent,
  bindExternalApplyActor, rememberExternalApplyContinuation,
  externalApplyContinuation, clearExternalApplyContinuation,
} from "./externalApplicationLaunch.js";

test("External launch intent and continuation lifecycle", async t => {
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage;
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  globalThis.window = { history: { state: { key: "original-entry" }, replaceState(state) { this.state = state; } } };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = originalStorage;
  });
  const job = { _id: "000000000000000000000001", source: "admin" };
  const destination = "https://example.invalid/apply?ref=a%2Bb&ref=a+b&empty=#part";
  const path = externalApplyPath(job, destination);
  let first;
  await t.test("same-origin locator round-trips the exact destination and explicit source", () => {
    assert(path.startsWith("/external-apply/admin/"));
    assert.deepEqual(readExternalApplyTarget(path), { jobId: job._id, source: "admin", expectedDestination: destination });
    assert.equal(externalApplyPath({ ...job, source: "unknown" }, destination), "");
    assert.equal(readExternalApplyTarget("https://evil.invalid/"), null);
    assert.equal(readExternalApplyTarget(path + "&destination=another"), null);
    assert.equal(readExternalApplyTarget(path.replace(encodeURIComponent(destination), encodeURIComponent("javascript:alert(1)"))), null);
  });
  await t.test("retry and reload reuse one intent; a new launch entry gets a fresh intent", () => {
    first = prepareExternalApplyIntent(path);
    assert.equal(prepareExternalApplyIntent(path).intentId, first.intentId);
    assert.equal(window.history.state.key, "original-entry");
    window.history.state = { key: "new-entry" };
    assert.notEqual(prepareExternalApplyIntent(path).intentId, first.intentId);
  });
  await t.test("sign-in continuation retains the original intent without tokens", () => {
    rememberExternalApplyContinuation(path, first.intentId);
    const continuation = externalApplyContinuation();
    assert.deepEqual(continuation, { to: path, intentId: first.intentId });
    assert.equal(prepareExternalApplyIntent(continuation.to, continuation.intentId).intentId, first.intentId);
    assert.equal(externalApplyContinuation({ externalApplyContinuation: { to: "//evil.invalid/", intentId: first.intentId } }), null);
    clearExternalApplyContinuation(first.intentId);
    assert.equal(externalApplyContinuation(), null);
  });
  await t.test("binding survives stale in-memory copies and rejects another account", () => {
    bindExternalApplyActor(first, "talent:one");
    assert.equal(bindExternalApplyActor(first, "talent:one").actor, "talent:one");
    assert.throws(() => bindExternalApplyActor(first, "talent:two"), /account changed/);
  });
  await t.test("a retained intent cannot be rebound to a changed destination", () => {
    assert.throws(() => prepareExternalApplyIntent(externalApplyPath(job, destination + "changed"), first.intentId), /different link/);
  });
  await t.test("continuation rejects arbitrary targets, absent intents and changed job/source/destination", () => {
    for (const to of ["https://evil.invalid/", "//evil.invalid/", "/talent-dashboard", "/signin?next=https://evil.invalid/",
      path.replace("/admin/", "/employer/"), path.replace(job._id, "000000000000000000000002"),
      externalApplyPath(job, destination + "changed"), path + "&destination=duplicate"]) {
      assert.equal(externalApplyContinuation({ externalApplyContinuation: { to, intentId: first.intentId } }), null);
    }
    assert.equal(externalApplyContinuation({ externalApplyContinuation: { to: path, intentId: crypto.randomUUID() } }), null);
    rememberExternalApplyContinuation(path, first.intentId);
    assert.deepEqual(externalApplyContinuation(), { to: path, intentId: first.intentId });
    clearExternalApplyContinuation(first.intentId);
  });
});
