import { findPublishedTalent } from "../services/publicTalentAccess.js";
import { savedPublicCvs, validPublicCvId, publicCvSummary } from "../services/publicTalentCv.js";

export async function getPublicTalentCv(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  res.set("Referrer-Policy", "no-referrer");
  try {
    // The only selector is the route's saved-record ID, never a file URL.
    if (Object.keys(req.query).length || Object.keys(req.body || {}).length) {
      return res.status(400).json({ success: false, message: "CV links accept a saved CV identifier only." });
    }
    if (!validPublicCvId(req.params.cvId)) return unavailable(res);
    const talent = await findPublishedTalent(req.params.username, "username fullName firstName lastName");
    if (!talent) return unavailable(res);
    const cv = (await savedPublicCvs(talent._id, talent.username)).find(file => file.id === req.params.cvId.toLowerCase());
    if (!cv) return unavailable(res);
    if (req.route.path.endsWith("/file")) return res.redirect(302, cv.url);
    return res.json({ success: true,
      talent: { username: talent.username, fullName: talent.fullName || [talent.firstName, talent.lastName].filter(Boolean).join(" ") || "Talent" },
      cv: { ...publicCvSummary(cv), filePath: cv.filePath },
    });
  } catch (error) { next(error); }
}
function unavailable(res) {
  return res.status(404).json({ success: false, message: "This profile or CV is unavailable. The CV may have been removed or the profile may no longer be public." });
}
