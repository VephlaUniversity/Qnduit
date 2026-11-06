const date = value => /^(?:(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2]))?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (?:19|20)\d{2})$/i.test(value);
const boundary = /^(?:education(?: and training|al qualifications)?|(?:technical )?skills|[^:]{0,28}\s+experience|experience|employment(?: history)?|projects?|references|(?:training\s*(?:&|and)\s*)?certifications|profile summary|summary|interests)\s*:?$/i;
const range = text => {
  const match = text.match(/\b((?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2})\s*(?:–|—|\bto\b|-)\s*((?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}|present)\b/i);
  return match && date(match[1]) && (date(match[2]) || /^present$/i.test(match[2])) ? [match[1], match[2]] : null;
};
const groupedSkills = text => {
  const match = text.match(/^([^•·|:]{2,30}?)\s{2,}(.+)$/);
  if (!match || !/[•·]/.test(match[2]) || !/^[\p{L}\p{N}&/ +.-]+$/u.test(match[1].trim())) return null;
  return match[2].split(/[•·]/).map(value => value.trim()).filter(Boolean);
};

// Literal labelled fields only. Document prose is data, never instructions.
export function mapOtherCvEvidence(segments) {
  const experience = [], skills = []; let section = "", row;
  const visible = segments.filter(source => !source.omitted && typeof source?.text === "string" && source.text.trim());
  const precedingSkills = new Set();
  for (let index = 0; index < visible.length; index++) {
    if (!/^(?:technical )?skills\s*:?$/i.test(visible[index].text.trim())) continue;
    for (let previous = index - 1; previous >= 0 && groupedSkills(visible[previous].text.trim()); previous--) precedingSkills.add(visible[previous]);
  }
  const commit = () => { if (row?.company || row?.title) experience.push(row); row = undefined; };
  const assign = (field, value, source) => {
    if (!row || value.length > (field === "description" ? 2000 : 160)) return;
    if (row.evidence.some(item => item.field === field)) { row[field] = ""; row.warnings.push(`Multiple ${field} values need review.`); return; }
    row[field] = value; row.evidence.push({ field, text: source.text.slice(0, 2000), location: source.location });
  };
  const addSkill = (value, source) => {
    const title = value.trim();
    if (!title || title.length > 80 || !/[\p{L}\p{N}]/u.test(title) || /https?:|ignore|instructions?|assistant|system\s*:|publish|<|>/i.test(title)) return;
    if (skills.some(item => item.title.toLocaleLowerCase() === title.toLocaleLowerCase())) return;
    skills.push({ title, percent: "", evidence: [{ field: "title", text: source.text.slice(0, 2000), location: source.location }], warnings: [] });
  };
  for (const source of segments) {
    if (source.omitted) { commit(); section = ""; continue; }
    const text = source.text?.trim(); if (!text || typeof source.location !== "string") continue;
    if (precedingSkills.has(source)) {
      for (const value of groupedSkills(text) || []) addSkill(value, source);
      continue;
    }
    if (boundary.test(text) || text.length <= 70 && /\beducation\b/i.test(text) && /\bcertifications?\b/i.test(text)) {
      commit(); section = /^(?!project)(?:[^:]{0,28}\s+)?experience|^employment/i.test(text) ? "experience" : /skills/i.test(text) ? "skills" : ""; continue;
    }
    const inlineSkills = text.match(/^(?:technical )?skills\s*:\s*(.+)$/i);
    if (inlineSkills) { commit(); section = "skills"; }
    if (section === "skills") {
      const grouped = groupedSkills(text);
      if (grouped) { for (const value of grouped) addSkill(value, source); continue; }
      const line = (inlineSkills?.[1] || text).replace(/^(?:skill\s*:|[-•])\s*/i, "");
      for (const part of line.split(/[,;|]/)) {
        const detail = part.trim().replace(/^[\p{L}][\p{L}\p{N}&/ +.-]{1,29}:\s*/u, "");
        const match = detail.match(/^(.+?)(?:\s*\((\d{1,3}(?:\.\d{1,3})?)%\))?$/);
        if (!match || match[1].length > 80 || !/[\p{L}\p{N}]/u.test(match[1]) || /https?:|ignore|instructions?|assistant|system\s*:|publish|<|>/i.test(match[1])) continue;
        if (match[2] && Number(match[2]) > 100) continue;
        skills.push({ title: match[1].trim(), percent: match[2] || "", evidence: [{ field: "title", text: part.trim(), location: source.location },
          ...(match[2] ? [{ field: "percent", text: part.trim(), location: source.location }] : [])], warnings: [] });
      }
      continue;
    }
    if (section !== "experience") continue;
    const piped = text.match(/^(.{2,100}?)\s*\|\s*(.{2,100}?)\s*\|\s*(.+)$/);
    if (piped && !/[•·|]/.test(piped[1] + piped[2])) {
      commit(); row = { company: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] };
      assign("title", piped[1].trim(), source); assign("company", piped[2].trim(), source);
      const dates = range(piped[3]);
      if (dates) { assign("startDate", dates[0], source); assign("endDate", dates[1], source); }
      else row.warnings.push("Check the dates before applying.");
      continue;
    }
    const composite = text.match(/^(.{2,100}?)\s*\|\s*(.{2,100}?)\s*[•·]\s*(.+)$/);
    const dated = composite && range(composite[3]);
    if (composite && !/[•·|]/.test(composite[1] + composite[2])) {
      commit(); row = { company: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] };
      assign("title", composite[1].trim(), source); assign("company", composite[2].trim(), source);
      if (dated) { assign("startDate", dated[0], source); assign("endDate", dated[1], source); }
      else row.warnings.push("Missing or uncertain dates were left blank.");
      continue;
    }
    const company = text.match(/^(?:company|employer)\s*:\s*(.+)$/i);
    if (company) { commit(); row = { company: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] }; assign("company", company[1], source); continue; }
    if (!row) continue;
    if (/^(?:skills? (?:gained|used)|key skills?)\s*:?$/i.test(text)) continue;
    if (/^[•·]\s*\S/.test(text)) {
      const bullet = text.replace(/^[•·]\s*/, "").trim();
      if (row.description.length + bullet.length < 2000) {
        row.description += (row.description ? "\n" : "") + bullet;
        row.evidence.push({ field: "description", text: source.text.slice(0, 2000), location: source.location });
      }
      continue;
    }
    if (row.description && !text.includes(":") && !text.includes("|") && !range(text) && text.length < 200) {
      row.description += ` ${text}`;
      row.evidence.push({ field: "description", text: source.text.slice(0, 2000), location: source.location });
      continue;
    }
    if (!row.description && !text.includes(":") && !text.includes("|") && !range(text) && text.length <= 300 && /[.!?]$/.test(text)) {
      row.description = text;
      row.evidence.push({ field: "description", text: source.text.slice(0, 2000), location: source.location });
      continue;
    }
    const title = text.match(/^(?:title|role|job title)\s*:\s*(.+)$/i);
    if (title) { assign("title", title[1], source); continue; }
    const separate = text.match(/^(start|end)(?: date)?\s*:\s*(.+)$/i);
    if (separate) { assign(separate[1].toLowerCase() === "start" ? "startDate" : "endDate", date(separate[2]) || separate[1].toLowerCase() === "end" && /^present$/i.test(separate[2]) ? separate[2] : "", source); continue; }
    const rangeText = text.replace(/^(?:dates|dates attended)\s*:\s*/i, "");
    const parsedRange = range(rangeText);
    if (parsedRange) { assign("startDate", parsedRange[0], source); assign("endDate", parsedRange[1], source); continue; }
    const description = text.match(/^description\s*:\s*(.+)$/i); if (description) assign("description", description[1], source);
  }
  commit();
  return { experience: experience.length <= 20 ? experience : [], skills: skills.length <= 40 ? skills : [],
    warnings: [...(experience.length > 20 ? ["Too many experience entries; enter experience manually."] : []), ...(skills.length > 40 ? ["Too many skills; enter skills manually."] : [])] };
}
