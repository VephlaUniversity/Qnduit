// Every new job reference carries its collection source. Never reuse Employer
// job URLs, IDs or application helpers for Admin posts.
const validJob = job => job?.source === "admin" && /^[a-f\d]{24}$/i.test(job.jobId || "") && Number.isSafeInteger(job.revision) && job.revision >= 0;
const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";
export function createAdminJobClient({ client, baseUrl, readOwner }) {
  const slots = new Map();
  const jobBody = (body, extra) => {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const data = new FormData(); for (const [key, value] of body.entries()) data.append(key, value);
      for (const [key, value] of Object.entries(extra)) data.set(key, String(value));
      return data;
    }
    return { ...body, ...extra };
  };
  const endpoint = `${baseUrl}/api/admin/posted-jobs`;
  const targetPath = target => {
    if (!validJob(target)) throw new Error("Select an Admin job with a saved revision.");
    return `${endpoint}/admin/${target.jobId}`;
  };
  async function run(slot, method, url, body, params, expected) {
    if (slot === "write" && slots.has(slot)) throw new Error("A job operation is already pending.");
    slots.get(slot)?.controller.abort();
    const owner = readOwner(), key = ownerKey(owner);
    if (!owner?.actor?.startsWith("admin:") || !owner.token) throw new Error("Sign in with an Admin account.");
    const operation = { controller: new AbortController() };
    slots.set(slot, operation);
    const current = () => slots.get(slot) === operation && !operation.controller.signal.aborted && key === ownerKey(readOwner());
    try {
      const response = await client.request({ method, url, data: body, params,
        headers: { Authorization: `Bearer ${owner.token}` }, signal: operation.controller.signal, timeout: typeof FormData !== "undefined" && body instanceof FormData ? 60000 : 15000 });
      if (!current()) return;
      const data = response.data;
      const valid = slot === "list" ? data?.source === "admin" && Array.isArray(data.data) && data.data.every(validJob)
        && Number.isSafeInteger(data.pagination?.page) && Number.isSafeInteger(data.pagination?.totalPages)
        : method === "DELETE" ? data?.source === "admin" && data.jobId === expected
          : validJob(data?.job) && (!expected || data.job.jobId === expected);
      if (data?.success !== true || !valid) throw new Error("Job operation was not confirmed. Refresh Admin Jobs.");
      return data;
    } catch (error) {
      if (current()) throw error;
    } finally { if (slots.get(slot) === operation) slots.delete(slot); }
  }
  return {
    cancel() { for (const row of slots.values()) row.controller.abort(); slots.clear(); },
    list: params => run("list", "GET", endpoint, undefined, { ...params, source: "admin" }),
    details: target => run("details", "GET", targetPath(target), undefined, undefined, target.jobId),
    create: body => run("write", "POST", endpoint, jobBody(body, { source: "admin" })),
    update: (target, body) => run("write", "PATCH", targetPath(target), jobBody(body, { source: "admin", revision: target.revision }), undefined, target.jobId),
    status: (target, status) => run("write", "PATCH", `${targetPath(target)}/status`, { source: "admin", revision: target.revision, status }, undefined, target.jobId),
    flag: target => run("write", "PATCH", `${targetPath(target)}/flag`, { source: "admin", revision: target.revision, flagged: !target.flagged }, undefined, target.jobId),
    remove: target => run("write", "DELETE", targetPath(target), { source: "admin", revision: target.revision }, undefined, target.jobId),
  };
}
