import Talent from "../../../models/Talent.js";
import { resolveSubscriptionStatus } from "../../../services/subscriptionStatus.js";
import { hasPortfolioAppearanceAccess } from "../../../utils/portfolioAppearance.js";
import { publicImageUrl } from "../../../utils/publicTalentProfile.js";
import { ownedPortfolioCover } from "../../../config/portfolioCover.js";
import { coverFailure, processPortfolioCover, portfolioCoverStorage } from "../../../services/portfolioCover.js";

const fields = "portfolioAppearance.cover portfolioAppearance.coverVersion";
const versionOf = talent => talent?.portfolioAppearance?.coverVersion ?? 0;
const matches = (record, asset, version) => versionOf(record) === version + 1
  && (asset ? record?.portfolioAppearance?.cover?.public_id === asset.public_id
    && record.portfolioAppearance.cover.url === asset.url : !record?.portfolioAppearance?.cover);
const coverDto = (record, owner) => {
  const cover = record?.portfolioAppearance?.cover;
  return ownedPortfolioCover(cover, owner) && publicImageUrl(cover?.url)
    ? { url: cover.url, width: cover.width, height: cover.height } : null;
};

export function createPortfolioCoverHandlers({ model = Talent, subscription = resolveSubscriptionStatus,
  process = processPortfolioCover, storage = portfolioCoverStorage } = {}) {
  async function requirePaidCoverOwner(req, res, next) {
    res.set("Cache-Control", "private, no-store");
    try {
      if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
      if (req.user.role !== "talent") return res.status(403).json({ success: false, message: "Talent account required." });
      const status = await subscription({ accountId: req.user._id, role: "talent" });
      if (!hasPortfolioAppearanceAccess(status)) throw coverFailure("An active Public Listing subscription is required to change the cover.", 403);
      const header = req.get("If-Match");
      if (!/^"(?:0|[1-9][0-9]{0,8})"$/.test(header || "")) throw coverFailure("Reload your saved appearance before changing the cover.", 428);
      const talent = await model.findById(req.user._id).select(fields).lean();
      if (!talent) throw coverFailure("Talent not found.", 404);
      if (versionOf(talent) !== Number(header.slice(1, -1))) throw coverFailure("Your cover changed in another session. Reload before changing it.", 409);
      req.portfolioCover = { previous: talent, version: versionOf(talent) };
      next();
    } catch (error) { next(error); }
  }
  async function change(req, res, next, removing) {
    let asset, allocated, attempted = false, confirmed = false;
    try {
      if (Object.keys(req.body || {}).length || !removing && !req.file) throw coverFailure("Choose one cover image, or use Remove cover.");
      const { previous, version } = req.portfolioCover;
      if (!removing) {
        const processed = await process(req.file);
        try { asset = await storage.upload(processed, req.user._id, value => { allocated = value; }); }
        catch (error) { throw coverFailure("We couldn't upload the cover. Your saved cover is unchanged.", error.statusCode === 503 ? 503 : 502); }
        if (!ownedPortfolioCover(asset, req.user._id) || !publicImageUrl(asset?.url)
          || asset.public_id !== allocated?.public_id) throw coverFailure("The cover upload could not be verified. Your saved cover is unchanged.", 502);
      }
      // A subscription can expire during image processing/provider work.
      if (!hasPortfolioAppearanceAccess(await subscription({ accountId: req.user._id, role: "talent" })))
        throw coverFailure("Paid access has ended. Your saved cover is unchanged.", 403);
      const filter = { _id: req.user._id, ...(version === 0
        ? { $or: [{ "portfolioAppearance.coverVersion": 0 }, { "portfolioAppearance.coverVersion": { $exists: false } }] }
        : { "portfolioAppearance.coverVersion": version }) };
      const update = { $inc: { "portfolioAppearance.coverVersion": 1 }, ...(removing
        ? { $unset: { "portfolioAppearance.cover": "" } } : { $set: { "portfolioAppearance.cover": asset } }) };
      let record;
      attempted = true;
      try {
        record = await model.findOneAndUpdate(filter, update,
          { new: true, runValidators: true, timestamps: false, writeConcern: { w: "majority" } }).select(fields).lean();
        if (!record) throw Object.assign(coverFailure("Your cover changed in another session. Reload before changing it.", 409), { definiteCoverFailure: true });
      } catch (error) {
        if (error.definiteCoverFailure || ["ValidationError", "CastError", "StrictModeError"].includes(error.name)) {
          attempted = false; throw error;
        }
        // Never delete an asset that an in-flight write could still commit.
        try { record = await model.findById(req.user._id).select(fields).readConcern("majority").lean(); }
        catch { /* Unreadable outcomes remain pending. */ }
      }
      if (!matches(record, asset, version)) return res.status(503).json({ success: false, code: "COVER_SAVE_PENDING",
        message: "We couldn't confirm this cover change. Reload the saved cover before trying again." });
      confirmed = true;
      if (ownedPortfolioCover(previous.portfolioAppearance?.cover, req.user._id)) {
        try { await storage.cleanup(previous.portfolioAppearance.cover); }
        catch { console.warn("A retired portfolio cover could not be cleaned up."); }
      }
      return res.json({ success: true, cover: coverDto(record, req.user._id), coverVersion: versionOf(record) });
    } catch (error) {
      if (!attempted && !confirmed && allocated) {
        try { await storage.cleanup(allocated); }
        catch { console.warn("An unused portfolio cover could not be cleaned up."); }
      }
      next(error);
    }
  }
  return { requirePaidCoverOwner, putPortfolioCover: (req, res, next) => change(req, res, next, false),
    deletePortfolioCover: (req, res, next) => change(req, res, next, true) };
}
export const { requirePaidCoverOwner, putPortfolioCover, deletePortfolioCover } = createPortfolioCoverHandlers();
