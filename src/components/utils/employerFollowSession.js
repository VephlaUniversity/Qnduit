// Requests use the same owner/token source as shared request safety. A cancelled
// mutation may already have reached the server; it is never replayed here.
export function createEmployerFollowSession({ client, baseUrl, readOwner }) {
  let generation = 0, read, mutation;
  const identity = owner => owner ? `${owner.actor}:${owner.token}` : "";
  const capture = controller => {
    const owner = readOwner(), key = identity(owner), version = generation;
    if (!owner?.actor.startsWith("talent:") || !owner.token) throw Error("Please sign in as Talent to view employers.");
    return { headers: { Authorization: `Bearer ${owner.token}` }, signal: controller.signal,
      check() {
        if (controller.signal.aborted || version !== generation || key !== identity(readOwner())) throw new client.CanceledError("Session or selection changed");
      } };
  };
  return {
    cancel() { generation++; read?.abort(); mutation?.abort(); read = mutation = null; },
    async load(tab, query) {
      read?.abort();
      const controller = new AbortController(); read = controller;
      const request = capture(controller);
      const endpoint = tab === "following" ? "following" : "search";
      const { data } = await client.get(`${baseUrl}/api/follows/employers/${endpoint}`, {
        headers: request.headers, signal: request.signal, params: { q: query.trim(), page: 1, limit: 50 },
      });
      request.check();
      if (!data?.success || !Array.isArray(data.data)) throw Error("Unable to load employers.");
      return data.data;
    },
    async toggle(employer) {
      if (mutation) throw Error("A follow update is already pending.");
      if (!/^[a-f\d]{24}$/i.test(employer.id)) throw Error("Invalid employer.");
      const controller = new AbortController(); mutation = controller;
      try {
        const request = capture(controller);
        // A pre-mutation list response must not overwrite the refreshed list.
        read?.abort();
        const url = `${baseUrl}/api/follows/employers/${employer.id}`;
        const options = { headers: request.headers, signal: request.signal };
        const { data } = employer.isFollowing ? await client.delete(url, options) : await client.post(url, {}, options);
        request.check();
        if (!data?.success) throw Error("Unable to update follow status.");
      } finally { if (mutation === controller) mutation = null; }
    },
  };
}
