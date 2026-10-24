export function createAdminDeleteSession({ client, baseUrl, readOwner }) {
  let operation, version = 0;
  const key = owner => owner ? `${owner.actor}:${owner.token}` : "";
  return {
    cancel() { version++; operation?.abort(); },
    async send(subject, update, saved) {
      if (operation) return;
      const owner = readOwner(), ownerKey = key(owner), currentVersion = version;
      if (!owner?.actor.startsWith("admin:") || !owner.token) { update({ status: "error", message: "Your admin session is unavailable." }); return; }
      if (!["talent", "employer"].includes(subject?.type) || !/^[a-f\d]{24}$/i.test(subject.id || "")) { update({ status: "error", message: "A valid selected account is required." }); return; }
      const controller = new AbortController(); operation = controller;
      const current = () => !controller.signal.aborted && currentVersion === version && ownerKey === key(readOwner());
      update({ status: "sending" });
      try {
        const { data } = await client.delete(`${baseUrl}/api/admin/${subject.type === "talent" ? "talents" : "employers"}/${subject.id}`, { signal: controller.signal, headers: { Authorization: `Bearer ${owner.token}` } });
        if (!current()) return;
        if (data?.success !== true) throw Error("Unconfirmed deletion");
        update({ status: "deleted", message: "User deleted successfully." }); saved(subject.type, subject.id);
      } catch (error) {
        if (current()) update({ status: error.response ? "error" : "uncertain", message: error.response?.data?.message || "Deletion could not be confirmed. Refresh the list before trying again." });
      } finally { if (operation === controller) operation = null; }
    },
  };
}
