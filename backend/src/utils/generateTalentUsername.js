import Talent from "../models/Talent.js";

const MAX_USERNAME_LENGTH = 160;
// Keep aligned with the top-level routes in src/App.jsx and public asset paths.
const RESERVED_USERNAMES = new Set([
  "talents", "employers", "pricing", "how-it-works", "contact", "about-us",
  "blog", "privacy-policy", "terms-of-service", "testimonials", "find-talents",
  "feature-talents", "jobs", "external-apply", "talent-signup", "employer-signup",
  "signin", "forgot-password", "payment", "payment-success", "admin-signin",
  "admin-dashboard", "dashboard", "talent-dashboard", "employer", "api",
  "assets", "images", "uploads", "public",
]);

export const generateTalentUsername = async (
  name,
  { excludeId, session } = {}
) => {
  const slug = (typeof name === "string" ? name : "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const baseUsername = (slug || "talent").slice(0, MAX_USERNAME_LENGTH).replace(/-+$/, "");

  let username = baseUsername;
  let suffix = 2;

  const queryOptions = session ? { session } : {};

  while (
    RESERVED_USERNAMES.has(username) || await Talent.exists({
      username,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).setOptions(queryOptions)
  ) {
    const ending = `-${suffix++}`;
    username = `${baseUsername.slice(0, MAX_USERNAME_LENGTH - ending.length).replace(/-+$/, "")}${ending}`;
  }

  return username;
};
