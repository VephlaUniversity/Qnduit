// Smarter job search: word-based matching with spelling variants, synonyms,
// small-typo tolerance and a relevance score. Pure functions (no database
// access) so they are easy to test; jobController.js feeds them the open jobs.

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "near",
  "me",
  "my",
  "job",
  "jobs",
  "role",
  "roles",
  "position",
  "positions",
  "vacancy",
  "vacancies",
  "opening",
  "openings",
  "hiring",
  "wanted",
  "needed",
  "looking",
  "work",
  "i",
  "am",
  "is",
  "are",
  "want",
  "need",
]);

// Words that mean the same thing. Every word in a group maps to the first.
const SYNONYM_GROUPS = [
  ["developer", "dev", "engineer", "programmer", "coder", "swe"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["nodejs", "node"],
  ["reactjs", "react"],
  ["designer", "design"],
  ["manager", "mgr", "management"],
  ["senior", "sr"],
  ["junior", "jr", "entry"],
  ["remote", "wfh", "anywhere"],
  ["hr", "human", "recruiter", "recruitment"],
  ["accountant", "accounting", "bookkeeper"],
  ["marketing", "marketer"],
  ["internship", "intern", "trainee"],
  ["parttime", "part"],
  ["fulltime", "full"],
  ["contract", "contractor"],
  ["freelance", "freelancer"],
  ["sales", "salesperson"],
  ["qa", "tester", "testing"],
  ["devops", "sre"],
  ["ml", "ai"],
];

const SYNONYM = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM.set(word, group[0]);
}

// Different ways people spell the same thing, joined into one word.
const JOINERS = [
  [/\bfront[\s-]?end\b/g, "frontend"],
  [/\bback[\s-]?end\b/g, "backend"],
  [/\bfull[\s-]?stack\b/g, "fullstack"],
  [/\bon[\s-]?site\b/g, "onsite"],
  [/\bpart[\s-]?time\b/g, "parttime"],
  [/\bfull[\s-]?time\b/g, "fulltime"],
  [/\bnode\.?\s?js\b/g, "nodejs"],
  [/\breact\.?\s?js\b/g, "reactjs"],
  [/\bvue\.?\s?js\b/g, "vuejs"],
  [/\bnext\.?\s?js\b/g, "nextjs"],
  [/\bui\s*\/\s*ux\b/g, "ui ux"],
  [/\bhuman resources?\b/g, "hr"],
  [/\bproject manag\w*\b/g, "pm"],
  [/\bproduct manag\w*\b/g, "pm"],
];

export const normalizeText = (value) => {
  let text = String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  for (const [pattern, replacement] of JOINERS) {
    text = text.replace(pattern, replacement);
  }
  return text;
};

// Light stemming: engineers -> engineer, designing -> design, companies -> company.
const stem = (word) => {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es") && /(ch|sh|x|s|z)es$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
};

const canonical = (word) => {
  const stemmed = stem(word);
  return SYNONYM.get(word) || SYNONYM.get(stemmed) || stemmed;
};

// Words for matching (stop words removed unless that would leave nothing).
export const tokenize = (value, { keepStopWords = false } = {}) => {
  const words = normalizeText(value)
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);
  const kept = keepStopWords ? words : words.filter((w) => !STOP_WORDS.has(w));
  return (kept.length ? kept : words).map(canonical);
};

// Distance with swaps counted as one edit ("devloper" is 1 away from "developer").
export const editDistance = (a, b, limit = 3) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = [];
  for (let i = 0; i <= a.length; i += 1) {
    rows.push(new Array(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
};

// How well one typed word matches one word of the job: 1 exact, 0.8 starts with
// it (partly typed), 0.6 a small typo, 0 no match.
export const matchToken = (queryToken, fieldToken, { fuzzy = true } = {}) => {
  if (queryToken === fieldToken) return 1;
  if (queryToken.length >= 2 && fieldToken.startsWith(queryToken)) return 0.8;
  if (fuzzy && queryToken.length >= 5 && fieldToken.length >= 4) {
    const allowed = queryToken.length >= 8 ? 2 : 1;
    if (editDistance(queryToken, fieldToken, allowed) <= allowed) return 0.6;
  }
  return 0;
};

const bestMatch = (queryToken, fieldTokens, options) => {
  let best = 0;
  for (const token of fieldTokens) {
    const score = matchToken(queryToken, token, options);
    if (score > best) best = score;
    if (best === 1) break;
  }
  return best;
};

const WEIGHTS = {
  title: 10,
  company: 5,
  category: 4,
  place: 3,
  type: 3,
  level: 2,
  description: 1,
};

const PLAN_BOOST = { platinum: 1.5, silver: 1, bronze: 0.5 };

const fieldsOf = (job) => ({
  title: tokenize(job.jobTitle, { keepStopWords: true }),
  company: tokenize(job.employer?.companyName, { keepStopWords: true }),
  category: tokenize(job.category, { keepStopWords: true }),
  place: tokenize(`${job.location || ""} ${job.address || ""}`, {
    keepStopWords: true,
  }),
  type: tokenize(
    `${job.workType || ""} ${job.jobCategory || ""} ${job.jobApplyType || ""}`,
    { keepStopWords: true },
  ),
  level: tokenize(`${job.careerLevel || ""} ${job.experience || ""}`, {
    keepStopWords: true,
  }),
  description: tokenize(job.jobDescription, { keepStopWords: true }),
});

// How many typed words must match for a job to be listed at all.
const requiredMatches = (count) =>
  count <= 2 ? count : Math.ceil(count * 0.6);

// Returns { score, matched } or null when the job does not match the words.
export const scoreJob = (job, queryTokens, phrase = "") => {
  if (!queryTokens.length) return { score: 0, matched: 0 };
  const fields = fieldsOf(job);
  let score = 0;
  let matched = 0;

  for (const queryToken of queryTokens) {
    let tokenScore = 0;
    for (const [name, weight] of Object.entries(WEIGHTS)) {
      const m = bestMatch(queryToken, fields[name], {
        fuzzy: name !== "description",
      });
      if (m > 0) tokenScore = Math.max(tokenScore, m * weight);
    }
    if (tokenScore > 0) {
      matched += 1;
      score += tokenScore;
    }
  }

  if (matched < requiredMatches(queryTokens.length)) return null;

  score += (matched / queryTokens.length) * 5;

  const title = normalizeText(job.jobTitle);
  if (phrase && title.includes(phrase)) score += 8;
  if (phrase && title.startsWith(phrase)) score += 4;

  score += PLAN_BOOST[job.employer?.selectedPlan] || 0;
  return { score, matched };
};

// Does the job's place fit what was typed in the Location box?
// "Lagos, Nigeria": the first part (the city) must match; the rest is optional.
export const matchesLocation = (job, locationText) => {
  const text = String(locationText || "").trim();
  if (!text) return true;

  const first = text.split(",")[0];
  const tokens = tokenize(first);
  if (!tokens.length) return true;

  if (tokens.includes("remote") && /remote/i.test(job.workType || "")) {
    return true;
  }

  const place = tokenize(`${job.location || ""} ${job.address || ""}`, {
    keepStopWords: true,
  });
  return tokens.every((t) => bestMatch(t, place, {}) > 0);
};

// Filter + rank. `jobs` already carry employer.companyName / selectedPlan.
export const rankJobs = (jobs, { q = "", location = "" } = {}) => {
  const located = jobs.filter((job) => matchesLocation(job, location));
  const queryTokens = tokenize(q);
  if (!queryTokens.length) return located;

  const phrase = normalizeText(q).replace(/\s+/g, " ").trim();
  const scored = [];
  for (const job of located) {
    const result = scoreJob(job, queryTokens, phrase);
    if (result) scored.push({ job, score: result.score });
  }

  // Close scores count as equal so the employer's plan and recency still decide.
  const bucket = (score) => Math.round(score / 3);
  scored.sort((x, y) => {
    const diff = bucket(y.score) - bucket(x.score);
    if (diff) return diff;
    const plan = (x.job.planPriority ?? 4) - (y.job.planPriority ?? 4);
    if (plan) return plan;
    return new Date(y.job.createdAt || 0) - new Date(x.job.createdAt || 0);
  });
  return scored.map((entry) => entry.job);
};

// ---- Suggestions while typing --------------------------------------------

// How well a label (job title, company, city) fits what was typed, 0 = no.
const labelScore = (label, queryTokens, phrase) => {
  const labelTokens = tokenize(label, { keepStopWords: true });
  if (!labelTokens.length) return 0;
  let total = 0;
  for (let i = 0; i < queryTokens.length; i += 1) {
    const isLast = i === queryTokens.length - 1;
    const m = bestMatch(queryTokens[i], labelTokens, { fuzzy: !isLast });
    if (!m) return 0; // every typed word has to fit
    total += m;
  }
  let score = total / queryTokens.length;
  const normalized = normalizeText(label);
  if (phrase && normalized.startsWith(phrase)) score += 1;
  else if (phrase && normalized.includes(phrase)) score += 0.5;
  return score;
};

const pickTop = (counts, queryTokens, phrase, limit) =>
  [...counts.values()]
    .map((entry) => ({
      ...entry,
      score: labelScore(entry.text, queryTokens, phrase),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.count - a.count || a.text.localeCompare(b.text),
    )
    .slice(0, limit)
    .map(({ text, count }) => ({ text, count }));

const addCount = (map, text) => {
  const clean = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!clean) return;
  const key = normalizeText(clean);
  const existing = map.get(key);
  if (existing) existing.count += 1;
  else map.set(key, { text: clean, count: 1 });
};

export const buildSuggestions = (jobs, rawQuery) => {
  const queryTokens = tokenize(rawQuery, { keepStopWords: true }).filter(
    Boolean,
  );
  const empty = { titles: [], companies: [], locations: [] };
  if (!queryTokens.length) return empty;

  const phrase = normalizeText(rawQuery).replace(/\s+/g, " ").trim();
  const titles = new Map();
  const companies = new Map();
  const places = new Map();
  let remote = 0;

  for (const job of jobs) {
    addCount(titles, job.jobTitle);
    addCount(companies, job.employer?.companyName);
    addCount(places, job.location);
    if (/remote/i.test(job.workType || "")) remote += 1;
  }
  if (remote) {
    places.set("remote", { text: "Remote", count: remote });
  }

  return {
    titles: pickTop(titles, queryTokens, phrase, 5),
    companies: pickTop(companies, queryTokens, phrase, 3),
    locations: pickTop(places, queryTokens, phrase, 3),
  };
};
