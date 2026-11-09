import Resume from "../models/Resume.js";
import Talent from "../models/Talent.js";

// An existing managed Resume is authoritative, including an empty list.
// Legacy ambiguity requires the owner's explicit choice, never array order.
export function selectActiveSavedCv(resumes, signup) {
  if (resumes.length > 1) return null;
  if (!resumes.length) return signup?.url ? signup : null;
  const files = resumes[0]?.cvFiles;
  return Array.isArray(files) && files.length === 1 && files[0]?.url ? files[0] : null;
}
export async function activeSavedCv(talentId) {
  const resumes = await Resume.find({ talent: talentId }).select("cvFiles").limit(2).lean();
  const signup = resumes.length ? null : (await Talent.findById(talentId).select("resume").lean())?.resume;
  return selectActiveSavedCv(resumes, signup);
}
