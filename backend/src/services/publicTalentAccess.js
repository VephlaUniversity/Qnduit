import Talent from "../models/Talent.js";
import { resolveTalentPublication } from "./talentPublication.js";

// Paid-only reader retained for public CV routes. Free portfolio publication
// must never broaden this helper's entitlement or account switches.
export async function findPublishedTalent(username, fields) {
  if (typeof username !== "string" || !username || username.length > 160) return null;
  const talent = await Talent.findOne({
    username: username.toLowerCase(), isVerified: true, accountStatus: "active",
    showProfile: "show", selectedPlan: "public", paymentStatus: "active", publicProfileEnabled: true,
  }).select(fields).lean();
  if (!talent) return null;
  const publication = await resolveTalentPublication(talent._id);
  return publication.publicProfile.status === "published" ? talent : null;
}

// Portfolio-only reader. Return derived capabilities separately from the selected
// Talent fields so callers can serialize an explicit DTO without billing data.
export async function findPublishedPortfolio(username, fields) {
  if (typeof username !== "string" || !username || username.length > 160) return null;
  const talent = await Talent.findOne({
    username: username.toLowerCase(), isVerified: true, accountStatus: "active", showProfile: "show",
  }).select(fields).lean();
  if (!talent) return null;
  const publication = await resolveTalentPublication(talent._id);
  return publication.publicPortfolio.status === "published" ? { talent, publication } : null;
}
