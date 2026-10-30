import Talent from "../models/Talent.js";
import Resume from "../models/Resume.js";
import { editorRevision, talentDraft } from "../utils/talentPortfolioDraft.js";

// Compatibility read; all writes now go through the page-level transaction.
export async function getTalentProjects(req, res, next) {
  try {
    const talent = await Talent.collection.findOne({ _id: req.user._id }, { projection: { portfolio: 1 } });
    if (!talent) return res.status(404).json({ success: false, message: "Talent not found." });
    const resume = await Resume.collection.findOne({ talent: req.user._id });
    const revision = editorRevision(talent, resume);
    res.set("Cache-Control", "private, no-store");
    res.json({ success: true, projects: talentDraft(talent.portfolio || [], req.user._id, revision), portfolioRevision: revision });
  } catch (error) { next(error); }
}
