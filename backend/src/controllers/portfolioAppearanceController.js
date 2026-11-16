import { publicPortfolioCover } from "../utils/publicTalentProfile.js";
import Talent from "../models/Talent.js";
import { resolveSubscriptionStatus } from "../services/subscriptionStatus.js";
import { hasPortfolioAppearanceAccess, isPortfolioFont, isPortfolioTheme, normalizePortfolioColor } from "../utils/portfolioAppearance.js";

const appearanceFields = "portfolioAppearance.theme portfolioAppearance.primaryColor portfolioAppearance.secondaryColor portfolioAppearance.font portfolioAppearance.backgroundColor portfolioAppearance.cover portfolioAppearance.coverVersion";

export function createPortfolioAppearanceHandlers({ model = Talent, subscription = resolveSubscriptionStatus } = {}) {
  const ownerAccess = (req, res) => {
    res.set("Cache-Control", "private, no-store");
    if (!req.user) { res.status(401).json({ success: false, message: "Sign in to continue." }); return false; }
    if (req.user.role !== "talent") { res.status(403).json({ success: false, message: "Talent account required." }); return false; }
    return true;
  };
  const respond = (res, talent) => {
    if (!talent) return res.status(404).json({ success: false, message: "Talent not found." });
    const theme = talent.portfolioAppearance?.theme;
    return res.json({ success: true, portfolioAppearance: {
      theme: isPortfolioTheme(theme) ? theme : null,
      cover: publicPortfolioCover(talent.portfolioAppearance?.cover, talent._id),
      coverVersion: talent.portfolioAppearance?.coverVersion ?? 0,
      primaryColor: normalizePortfolioColor(talent.portfolioAppearance?.primaryColor),
      secondaryColor: normalizePortfolioColor(talent.portfolioAppearance?.secondaryColor),
      backgroundColor: normalizePortfolioColor(talent.portfolioAppearance?.backgroundColor),
      font: isPortfolioFont(talent.portfolioAppearance?.font) ? talent.portfolioAppearance.font : null,
    } });
  };
  async function getPortfolioAppearance(req, res, next) {
    if (!ownerAccess(req, res)) return;
    try {
      return respond(res, await model.findById(req.user._id).select(appearanceFields).lean());
    } catch (error) { next(error); }
  }
  async function putPortfolioAppearance(req, res, next) {
    if (!ownerAccess(req, res)) return;
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length
      || Object.keys(body).some(key => !["theme", "primaryColor", "secondaryColor", "font", "backgroundColor"].includes(key))
      || Object.hasOwn(body, "theme") && !isPortfolioTheme(body.theme)) {
      return res.status(400).json({ success: false, message: "Choose supported appearance settings." });
    }
    const update = {}, set = {}, unset = {};
    if (Object.hasOwn(body, "theme")) set["portfolioAppearance.theme"] = body.theme;
    if (Object.hasOwn(body, "font")) {
      if (body.font === null) unset["portfolioAppearance.font"] = "";
      else if (isPortfolioFont(body.font)) set["portfolioAppearance.font"] = body.font;
      else return res.status(400).json({ success: false, message: "Choose an available font, or reset to the theme font." });
    }
    for (const field of ["primaryColor", "secondaryColor", "backgroundColor"]) if (Object.hasOwn(body, field)) {
      if (body[field] === null) unset[`portfolioAppearance.${field}`] = "";
      else {
        const color = normalizePortfolioColor(body[field]);
        if (!color) return res.status(400).json({ success: false, message: "Use a hex colour such as #2563eb, or reset the override." });
        set[`portfolioAppearance.${field}`] = color;
      }
    }
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    try {
      const status = await subscription({ accountId: req.user._id, role: "talent" });
      if (!hasPortfolioAppearanceAccess(status)) {
        return res.status(403).json({ success: false, code: "APPEARANCE_PAID_REQUIRED", message: "An active Public Listing subscription is required to save appearance changes." });
      }
      // Never replace the owner document or any portfolio/profile content.
      const talent = await model.findByIdAndUpdate(req.user._id,
        update, { new: true, runValidators: true, timestamps: false }).select(appearanceFields).lean();
      return respond(res, talent);
    } catch (error) { next(error); }
  }
  return { getPortfolioAppearance, putPortfolioAppearance };
}

export const { getPortfolioAppearance, putPortfolioAppearance } = createPortfolioAppearanceHandlers();
