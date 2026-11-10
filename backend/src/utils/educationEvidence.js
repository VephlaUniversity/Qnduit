const fields = ["academy", "title", "startDate", "endDate", "description"];
const clean = text => Array.from(text).filter(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127).join("").trim();
const degree = raw => {
  const value = raw.toLowerCase().replace(/[’]/g, "'").trim();
  if (/^(?:b\.?\s*sc\.?|bsc|b\.?\s*a\.?|b\.?\s*eng\.?)(?:\s|$)/i.test(value)) return "Bachelor's";
  if (/^(?:m\.?\s*sc\.?|msc|m\.?\s*a\.?)(?:\s|$)/i.test(value)) return "Master's";
  if (/^(bachelor(?:'s)?(?: degree)?|bachelor of (?:science|arts|engineering|education|laws)(?: in .+)?)$/.test(value)) return "Bachelor's";
  if (/^(master(?:'s)?(?: degree)?|master of (?:science|arts|engineering|education|business administration)(?: in .+)?)$/.test(value)) return "Master's";
  return ({ gcse: "GCSE", "a-level": "A-Level", "a levels": "A-Level", diploma: "Diploma", phd: "PhD", "ph.d.": "PhD", "doctor of philosophy": "PhD" })[value] || "";
};
const date = value => /^(?:(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2]))?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (?:19|20)\d{2})$/i.test(value);
const qualificationParts = text => {
  const match = text.match(/^(bachelor of (?:science|arts|engineering|education|laws)|bachelor(?:'s)?|master of (?:science|arts|engineering|education|business administration)|master(?:'s)?|b\.?\s*sc\.?|bsc|m\.?\s*sc\.?|msc)(?:\s*\([^)]{1,24}\))?(?:\s+in)?\s+([^|,;]+)/i);
  return match ? { title: degree(match[1]), description: match[2].trim() } : null;
};

// Conservative single-column extraction. Every suggestion points to literal
// source text. No LLM, prompt execution, qualification equivalence or inferred dates.
export function mapEducationEvidence(segments) {
  const entries = [];
  let inEducation = false, row;
  const commit = () => {
    if (row?.academy) {
      const degreeMissing = !row.title, datesMissing = !row.startDate || !row.endDate;
      row.warnings = row.warnings.filter(value => !/^Check (?:the )?(?:degree|dates|degree and dates) before applying\.$/.test(value));
      if (degreeMissing && datesMissing) row.warnings.push("Check the degree and dates before applying.");
      else if (degreeMissing) row.warnings.push("Check the degree before applying.");
      else if (datesMissing) row.warnings.push("Check the dates before applying.");
      entries.push(row);
    }
    row = undefined;
  };
  const assign = (field, value, source, literal = value) => {
    if (!row || value.length > (field === "description" ? 2000 : 160)) return;
    // Repeated/conflicting source fields cannot silently overwrite a suggestion.
    if (row.evidence.some(item => item.field === field)) {
      row[field] = ""; row.warnings.push(field === "academy" ? "Check institution before applying." : field === "title" ? "Check the degree before applying." : /Date$/.test(field) ? "Check the dates before applying." : `Check ${field} before applying.`);
      return;
    }
    row[field] = value;
    row.evidence.push({ field, text: literal.slice(0, 2000), location: source.location });
  };
  for (const source of segments) {
    if (typeof source?.text !== "string" || typeof source?.location !== "string") continue;
    if (source.omitted) { commit(); inEducation = false; continue; }
    const text = clean(source.text);
    if (/^education(?: and training|al qualifications)?\s*:?$/i.test(text)) { commit(); inEducation = true; continue; }
    if (/^(?:[^:]{0,28}\s+experience|experience|employment(?: history)?|(?:technical )?skills|projects?|references|(?:training\s*(?:&|and)\s*)?certifications|profile summary|summary|interests)\s*:?$/i.test(text)) {
      commit(); inEducation = false; continue;
    }
    if (!inEducation || !text) continue;
    // A visual row can wrap after a pipe: qualification and institution on
    // one extracted line, dates on the next. Use each field's own source span.
    const pipeSpans = text.split(/\s*\|\s*/).map(part => part.trim()).filter(Boolean);
    const schools = pipeSpans.filter(part => /\b(?:university|college|institute|academy|school)\b/i.test(part));
    if (pipeSpans.length > 1 && schools.length === 1 && !/\b(?:ignore|instructions?|assistant|system|prompt)\b/i.test(text)) {
      const school = schools[0].split(",")[0].trim();
      if (school && school.length <= 160) {
        commit(); row = { academy: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] };
        assign("academy", school, source, schools[0]);
        const qualification = pipeSpans.map(qualificationParts).find(Boolean);
        if (qualification?.title) assign("title", qualification.title, source, text);
        if (qualification?.description) assign("description", qualification.description, source, text);
        const dates = text.match(/\b((?:19|20)\d{2})\s*(?:–|—|\bto\b|-)\s*((?:19|20)\d{2}|present)\b/i);
        if (dates) { assign("startDate", dates[1], source, text); assign("endDate", dates[2], source, text); }
        continue;
      }
    }
    // Bullets and dashes often separate degree/course, school and dates on one
    // PDF line. Take only the explicit school span and supported degree/date
    // spans; do not turn the whole line into an institution or guess a course.
    const parts = text.split(/\s+[·•]\s+/);
    const spans = parts.length > 1 ? parts : text.split(/\s+[–—-]\s+/);
    const schoolParts = spans.filter(part => /\b(?:university|college|institute|academy|school)\b/i.test(part));
    if (spans.length > 1 && schoolParts.length === 1 && !/\b(?:ignore|instructions?|assistant|system|prompt)\b/i.test(text)) {
      const school = schoolParts[0].split(",")[0]
        .replace(/\s+(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}\b.*$/i, "").trim();
      if (school.length && school.length <= 160) {
        commit(); row = { academy: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] };
        assign("academy", school, source, text);
        const qualification = spans.find(part => /^(?:b\.?\s*sc\.?|bsc|b\.?\s*a\.?|b\.?\s*eng\.?|m\.?\s*sc\.?|msc|m\.?\s*a\.?|bachelor|master|ph\.?d\.?|diploma)(?=\s|$)/i.test(part));
        if (qualification) {
          assign("title", degree(qualification), source, text);
          const subject = qualification.replace(/^(?:b\.?\s*sc\.?|bsc|b\.?\s*a\.?|b\.?\s*eng\.?|m\.?\s*sc\.?|msc|m\.?\s*a\.?|bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|diploma)\s*(?:in\s+)?/i, "").trim();
          if (subject && subject !== qualification && subject.length <= 160) assign("description", subject, source, text);
        }
        const dated = spans.find(part => /\b(?:19|20)\d{2}\s*(?:–|—|\bto\b|\s-\s)\s*(?:(?:19|20)\d{2}|present)\b/i.test(part));
        const range = dated?.match(/\b((?:19|20)\d{2})\s*(?:–|—|\bto\b|\s-\s)\s*((?:19|20)\d{2}|present)\b/i);
        if (range) { assign("startDate", range[1], source, text); assign("endDate", range[2], source, text); }
        continue;
      }
    }
    const institution = text.match(/^(?:institution|university|college|school)\s*:\s*(.+)$/i);
    const standaloneInstitution = !text.includes(":") && !text.includes("|") && text.length <= 160 && /\b(?:university|college|institute|academy|school)\b/i.test(text)
      && !/\b(?:ignore|instructions?|assistant|system|prompt)\b/i.test(text);
    if (institution || standaloneInstitution) {
      commit(); row = { academy: "", title: "", startDate: "", endDate: "", description: "", evidence: [], warnings: [] };
      assign("academy", institution ? institution[1] : text, source, text); continue;
    }
    if (!row) continue;
    const qualification = text.match(/^(?:degree(?: level)?|qualification)\s*:\s*(.+)$/i);
    const mapped = degree(qualification ? qualification[1] : text);
    if (qualification || mapped || /^(?:higher national|national|professional) (?:diploma|certificate)|^certificate\b/i.test(text)) {
      assign("title", mapped, source, text);
      if (!mapped) row.warnings.push("Check the degree before applying.");
      continue;
    }
    const start = text.match(/^start(?: date)?\s*:\s*(.+)$/i), end = text.match(/^end(?: date)?\s*:\s*(.+)$/i);
    if (start || end) {
      const value = (start || end)[1];
      assign(start ? "startDate" : "endDate", date(value) || end && /^present$/i.test(value) ? value : "", source, text);
      continue;
    }
    const rangeText = text.replace(/^\|\s*/, "").replace(/^(?:dates|dates attended)\s*:\s*/i, "");
    const range = rangeText.match(/^(.+?)\s*(?:–|—|\bto\b)\s*(.+)$/i)
      || rangeText.match(/^(.+?)\s+-\s+(.+)$/)
      || rangeText.match(/^((?:19|20)\d{2})-((?:19|20)\d{2}|Present)$/i);
    if (range && date(range[1]) && (date(range[2]) || /^present$/i.test(range[2]))) {
      assign("startDate", range[1], source, text); assign("endDate", range[2], source, text); continue;
    }
    const description = text.match(/^description\s*:\s*(.+)$/i);
    if (description) assign("description", description[1], source, text);
  }
  commit();
  if (entries.length > 20) return { entries: [], warning: "More than 20 education entries were found. Please enter education manually." };
  return { entries: entries.map(entry => ({ ...Object.fromEntries(fields.map(field => [field, entry[field]])), evidence: entry.evidence, warnings: [...new Set(entry.warnings)] })),
    warning: entries.length ? "Review every suggestion against its source. Unrecognised text was not mapped." : "No reliably supported education entries were found. Use a simple Education section or enter education manually." };
}
