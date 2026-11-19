import Talent from "../../../models/Talent.js";
import Resume from "../../../models/Resume.js";
import { resolveSubscriptionStatus } from "../../../services/subscriptionStatus.js";
import { hasPortfolioAppearanceAccess, resolvePortfolioTheme, resolvePortfolioColors, resolvePortfolioFont, resolvePortfolioBackground } from "../../../utils/portfolioAppearance.js";
import { PUBLIC_TALENT_FIELDS, PUBLIC_RESUME_FIELDS, publicTalentProfileDto, resolvePortfolioCover } from "../../../utils/publicTalentProfile.js";

export function createPortfolioPreviewHandler({ talents = Talent, resumes = Resume, subscription = resolveSubscriptionStatus } = {}) {
  return async function getPortfolioPreview(req, res, next) {
    res.set("Cache-Control", "private, no-store");
    if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
    if (req.user.role !== "talent") return res.status(403).json({ success: false, message: "Talent account required." });
    try {
      const status = await subscription({ accountId: req.user._id, role: "talent" });
      if (!hasPortfolioAppearanceAccess(status)) return res.status(403).json({ success: false, code: "APPEARANCE_PAID_REQUIRED", message: "An active Public Listing subscription is required to preview appearance changes." });
      // Read only the authenticated owner. Publication flags are neither required nor changed.
      const talent = await talents.findById(req.user._id).select(PUBLIC_TALENT_FIELDS).lean();
      if (!talent) return res.status(404).json({ success: false, message: "Talent not found." });
      const resume = await resumes.findOne({ talent: req.user._id }).select(PUBLIC_RESUME_FIELDS).lean();
      const appearance = talent.portfolioAppearance;
      return res.json({ success: true, talent: {
        ...publicTalentProfileDto(talent, resume, {
          subscriptionStatus: status, paidPortfolio: true,
          theme: resolvePortfolioTheme(appearance?.theme, status),
          colors: resolvePortfolioColors(appearance, status),
          font: resolvePortfolioFont(appearance, status),
          backgroundColor: resolvePortfolioBackground(appearance, status),
          cover: resolvePortfolioCover(appearance, status, talent._id),
        }),
        requiresQnduitBranding: false, cvs: [],
      } });
    } catch (error) { next(error); }
  };
}
export const getPortfolioPreview = createPortfolioPreviewHandler();
