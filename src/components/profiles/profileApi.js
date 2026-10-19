import { API_BASE_URL } from "../utils/api";
import { OFFLINE_ERROR, SERVER_ERROR, safeText } from "../utils/userMessage";

export async function profileRequest(path, options = {}) {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (networkError) {
    if (networkError.name === "AbortError") throw networkError;
    throw new Error(OFFLINE_ERROR); // never show "Failed to fetch"
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const fallback = "Unable to load profile information. Please try again.";
    const error = new Error(
      response.status >= 500 ? SERVER_ERROR : safeText(data.message, fallback),
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function profileImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  // Resolve legacy relative paths without prefixing already absolute Cloudinary URLs.
  try {
    const url = new URL(value, `${API_BASE_URL}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function editorPlainText(value) {
  if (typeof value !== "string") return "";
  // A detached template is inert: no editor HTML is inserted into the live page.
  // React renders the resulting string as text, never as HTML.
  const template = document.createElement("template");
  template.innerHTML = value;
  template.content
    .querySelectorAll("script,style,iframe,object,embed,template")
    .forEach((node) => node.remove());
  template.content
    .querySelectorAll("br")
    .forEach((node) => node.replaceWith("\n"));
  template.content
    .querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6")
    .forEach((node) => node.append("\n"));
  return (template.content.textContent || "").trim();
}

export function profileName(profile) {
  if (profile.userType === "talent") {
    return (
      profile.fullName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      "Talent"
    );
  }
  return (
    (profile.accountType === "individual"
      ? profile.displayName
      : profile.companyName) ||
    profile.companyName ||
    profile.displayName ||
    "Employer"
  );
}
