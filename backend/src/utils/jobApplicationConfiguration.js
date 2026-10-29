// Validate effective configuration, including partial edits and legacy jobs.
export function jobApplicationConfiguration(body, existing = {}) {
  const errors = {};
  const applicationType = Object.hasOwn(body, "applicationType")
    ? body.applicationType : existing.applicationType ?? "internal";
  if (!["internal", "external"].includes(applicationType)) {
    errors.applicationType = "Choose Internal or External applications.";
  }
  let applicationUrl = "";
  if (applicationType === "external") {
    const raw = Object.hasOwn(body, "applicationUrl") ? body.applicationUrl : existing.applicationUrl;
    const value = typeof raw === "string" ? raw.trim() : "";
    try {
      // Require an explicit absolute URL; URL() alone accepts forms such as https:example.com.
      if (!/^https?:\/\/[^/?#]/i.test(value) || (/[\s\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) throw new Error("Invalid URL");
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("Invalid URL");
      applicationUrl = value; // Preserve employer query strings and their encoding exactly.
    } catch {
      errors.applicationUrl = "Enter a valid absolute HTTP or HTTPS application URL without credentials.";
    }
  }
  return { errors, configuration: { applicationType, applicationUrl } };
}
