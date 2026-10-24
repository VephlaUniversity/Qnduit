export function createSupportSession({ client, baseUrl, readOwner }) {
  const controllers = new Set(); let version = 0, mutation = false;
  const key = owner => owner ? `${owner.actor}:${owner.token}` : "";
  return {
    isCurrent: () => !!readOwner(),
    cancel() { version++; controllers.forEach(controller => controller.abort()); controllers.clear(); },
    async request(method, path, body) {
      const owner = readOwner(), ownerKey = key(owner), revision = version;
      if (!owner?.token || !/^(talent|employer):/.test(owner.actor)) throw new client.CanceledError("Session changed");
      if (method !== "GET" && mutation) throw Error("A Support request is already pending.");
      const controller = new AbortController(); controllers.add(controller);
      if (method !== "GET") mutation = true;
      try {
        const { data } = await client.request({ method, url: `${baseUrl}/api/support${path}`, data: body, signal: controller.signal, headers: { Authorization: `Bearer ${owner.token}` } });
        if (controller.signal.aborted || revision !== version || ownerKey !== key(readOwner())) throw new client.CanceledError("Session changed");
        if (!data?.success) throw Error("Support request could not be confirmed.");
        return data;
      } catch (error) {
        if (controller.signal.aborted || revision !== version || ownerKey !== key(readOwner())) throw new client.CanceledError("Session changed");
        throw error;
      } finally { controllers.delete(controller); if (method !== "GET") mutation = false; }
    },
  };
}
