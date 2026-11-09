import Talent from "../models/Talent.js";
import { resolveTalentPublication } from "./talentPublication.js";

// Use the same account switches and authoritative paid evidence for every public
// profile/CV read. No credentials or owner fields are serialized by this helper.
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
