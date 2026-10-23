import axios from "axios";

// JSON API callers share the same request ownership, suspension and cooldown
// interceptors as Axios callers. Asset/download fetches keep their own transport.
export function createApiFetch(client) {
  return async (url, options = {}) => {
    let result;
    try {
      result = await client.request({ url, method: options.method || "GET", data: options.body,
        headers: Object.fromEntries(new Headers(options.headers).entries()), signal: options.signal,
        withCredentials: options.credentials === "include" });
    } catch (error) {
      if (axios.isCancel(error)) throw new DOMException("Request cancelled", "AbortError");
      if (!error.response) throw error;
      result = error.response;
    }
    const headers = Object.fromEntries(Object.entries(result.headers || {}).filter(([, value]) => value != null));
    return new Response([204, 205, 304].includes(result.status) ? null
      : typeof result.data === "string" ? result.data : JSON.stringify(result.data), { status: result.status, headers });
  };
}
export const apiFetch = createApiFetch(axios);
