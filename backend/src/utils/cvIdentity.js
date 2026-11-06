// Comparison only: these functions never rewrite saved/displayed values.
export const educationTextKey = value => String(value || "").normalize("NFKC").toLowerCase()
  .replace(/['’]/g, "").replace(/[^\p{L}\p{N}+#]+/gu, " ").trim();

export function qualificationIdentity(value) {
  const raw = educationTextKey(value);
  if (!raw) return { family: "", subject: "", program: "" };
  const simple = { phd: "phd", "ph d": "phd", "d phil": "phd", dphil: "phd", "doctor of philosophy": "phd",
    gcse: "gcse", "a level": "a-level", "a levels": "a-level", diploma: "diploma",
    hnd: "hnd", "higher national diploma": "hnd" };
  if (simple[raw]) return { family: simple[raw], subject: "", program: "" };
  const aliases = [
    [/^(?:bsc|b sc|bs|b s)(?: in (.+))?$/, "bachelor", "science"],
    [/^(?:ba|b a)(?: in (.+))?$/, "bachelor", "arts"],
    [/^(?:beng|b eng)(?: in (.+))?$/, "bachelor", "engineering"],
    [/^(?:msc|m sc|ms|m s)(?: in (.+))?$/, "master", "science"],
    [/^(?:ma|m a)(?: in (.+))?$/, "master", "arts"],
    [/^(?:phd|ph d|doctor of philosophy)(?: in (.+))$/, "phd", ""],
  ];
  for (const [pattern, family, subject] of aliases) {
    const match = raw.match(pattern);
    if (match) return { family, subject, program: match[1] || "" };
  }
  const degree = raw.match(/^(bachelor|master)(?: s|s)?(?: degree)?(?: of (science|arts|engineering|education|laws|business administration))?(?: in (.+))?$/);
  if (degree) return { family: degree[1], subject: degree[2] || "", program: degree[3] || "" };
  return { family: `custom:${raw}`, subject: "", program: "" };
}

const months = [["jan", "january"], ["feb", "february"], ["mar", "march"], ["apr", "april"], ["may"], ["jun", "june"],
  ["jul", "july"], ["aug", "august"], ["sep", "sept", "september"], ["oct", "october"], ["nov", "november"], ["dec", "december"]];
export function educationDateIdentity(value) {
  const raw = educationTextKey(value);
  if (!raw) return { parts: [], known: false, raw };
  if (["present", "current", "ongoing"].includes(raw)) return { parts: ["present"], known: true, raw: "present" };
  let parts;
  if (/^\d{4}(?: \d{1,2}){0,2}$/.test(raw)) parts = raw.split(" ").map(Number);
  else if (/^\d{1,2} \d{4}$/.test(raw)) { const [month, year] = raw.split(" ").map(Number); parts = [year, month]; }
  else {
    const text = raw.match(/^([a-z]+) (\d{4})$/);
    const month = text ? months.findIndex(values => values.includes(text[1])) + 1 : 0;
    if (month) parts = [Number(text[2]), month];
  }
  const valid = parts && parts[0] >= 1800 && parts[0] <= 2200
    && (parts.length < 2 || parts[1] >= 1 && parts[1] <= 12)
    && (parts.length < 3 || parts[2] >= 1 && parts[2] <= new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate());
  return { parts: valid ? parts : [], known: Boolean(valid), raw: valid ? parts.join("-") : raw };
}

export function qualificationRelation(a, b) {
  if (!a.family || !b.family) return "ambiguous";
  if (a.family !== b.family) return "different";
  for (const field of ["subject", "program"]) if (a[field] && b[field] && a[field] !== b[field]) return "different";
  return a.subject === b.subject && a.program === b.program ? "equal" : "ambiguous";
}
export function educationDateRelation(a, b) {
  if (!a.known || !b.known) return "ambiguous";
  if (a.parts.slice(0, Math.min(a.parts.length, b.parts.length)).some((part, index) => part !== b.parts[index])) return "different";
  return a.parts.length === b.parts.length ? "equal" : "ambiguous";
}
