// Turns API/network failures into text that is safe and readable for end users.
// Never exposes status codes, "Network Error", Mongo/JWT/stack text, etc.

const TECHNICAL =
  /(status code|request failed|network error|econn|enotfound|etimedout|timeout of|cast to|objectid|e11000|duplicate key|mongo|mongoose|validationerror|jsonwebtokenerror|tokenexpired|\bjwt\b|typeerror|referenceerror|syntaxerror|unexpected token|undefined|\bnull\b|\bnan\b|stack|at \S+ \(|[{}<>]|\berror\s*(code)?\s*:?\s*\d{3}\b|^\d{3}\b|^error\b)/i;

export const GENERIC_ERROR = "Something went wrong. Please try again.";
export const OFFLINE_ERROR =
  "We couldn't reach the server. Please check your internet connection and try again.";
export const SERVER_ERROR =
  "Something went wrong on our side. Please try again in a moment.";

// Returns `text` only when it already reads like a sentence meant for a person.
export function safeText(text, fallback = GENERIC_ERROR) {
  if (typeof text !== "string") return fallback;
  const value = text.trim();
  if (value.length < 3 || value.length > 160 || TECHNICAL.test(value))
    return fallback;
  return value;
}

export function friendlyError(error, fallback = GENERIC_ERROR) {
  const status = error?.response?.status ?? error?.status;
  // No response at all: the user is offline or the server is unreachable.
  if (!status) {
    return error?.request ||
      /network|failed to fetch|load failed/i.test(error?.message || "")
      ? OFFLINE_ERROR
      : fallback;
  }
  if (status >= 500) return SERVER_ERROR;
  if (status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  const data = error.response?.data;
  const serverText = safeText(data?.message ?? data?.error, "");
  if (serverText) return serverText;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  return fallback;
}
