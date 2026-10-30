import { publicExternalUrl } from "./publicTalentProfile.js";

// Shared by the owner editor and server. Keep accepted links usable by the public DTO.
export function portfolioMetadata(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Invalid portfolio item.");
  }
  const optionalText = (value, label, limit) => {
    if (value === undefined) return "";
    if (typeof value !== "string") throw new Error(`${label} must be text.`);
    const text = value.trim();
    if (text.length > limit) throw new Error(`${label} must be at most ${limit} characters.`);
    return text;
  };
  const description = optionalText(row.description, "Project description", 2000);
  const projectUrl = optionalText(row.projectUrl, "Project URL", 2048);
  if (projectUrl && (!/^https?:\/\/[^/?#]/i.test(projectUrl) || !publicExternalUrl(projectUrl))) {
    throw new Error("Enter a valid absolute HTTP or HTTPS project URL without credentials or a local/internal host.");
  }
  const suppliedSkills = row.skills === undefined ? [] : row.skills;
  if (!Array.isArray(suppliedSkills) || suppliedSkills.length > 20) {
    throw new Error("Use at most 20 skills per project.");
  }
  const seen = new Set();
  const skills = suppliedSkills.map(value => optionalText(value, "Project skill", 80))
    .filter(value => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { description, projectUrl, skills };
}
