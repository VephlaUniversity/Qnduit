
import { normalizePortfolioImages } from "./resumePortfolio.js";
import { publicImageUrl } from "./publicTalentProfile.js";

export const MAX_VERSION_PROJECTS = 20;

export const PORTFOLIO_VERSION_LIMITS = {
  title: 100,
  slug: 64,
  targetRole: 100,
  introduction: 5000,
};

const own = (value, key) => Object.hasOwn(value, key);

const fail = message => ({ error: message });

const cleanText = value =>
  typeof value === "string" ? value.trim() : "";

export function portfolioVersionSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PORTFOLIO_VERSION_LIMITS.slug)
    .replace(/-+$/g, "");
}

export function normalizePortfolioVersionInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("Invalid portfolio version details.");
  }

  const allowed = new Set([
    "title",
    "slug",
    "targetRole",
    "introduction",
    "selectedProjects",
  ]);

  if (Object.keys(input).some(key => !allowed.has(key))) {
    return fail("The request contains unsupported portfolio version fields.");
  }

  if (!partial && !own(input, "title")) {
    return fail("Enter a portfolio version title.");
  }

  if (partial && Object.keys(input).length === 0) {
    return fail("Provide at least one field to update.");
  }

  const value = {};

  if (own(input, "title")) {
    if (typeof input.title !== "string") {
      return fail("Enter a valid portfolio version title.");
    }

    value.title = input.title.trim().replace(/\s+/g, " ");

    if (
      value.title.length < 2 ||
      value.title.length > PORTFOLIO_VERSION_LIMITS.title
    ) {
      return fail("The version title must contain between 2 and 100 characters.");
    }
  }

  if (own(input, "slug")) {
    if (
      typeof input.slug !== "string" ||
      input.slug.length > PORTFOLIO_VERSION_LIMITS.slug
    ) {
      return fail("Enter a valid portfolio URL slug.");
    }

    value.slug = input.slug.trim().toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || value.slug.length < 2) {
      return fail("Use a URL slug containing lowercase letters, numbers and hyphens.");
    }
  }

  if (own(input, "targetRole")) {
    if (typeof input.targetRole !== "string") {
      return fail("Enter a valid target role.");
    }

    value.targetRole = input.targetRole.trim().replace(/\s+/g, " ");

    if (value.targetRole.length > PORTFOLIO_VERSION_LIMITS.targetRole) {
      return fail("The target role cannot exceed 100 characters.");
    }
  }

  if (own(input, "introduction")) {
    if (typeof input.introduction !== "string") {
      return fail("Enter a valid portfolio introduction.");
    }

    value.introduction = input.introduction.trim();

    if (value.introduction.length > PORTFOLIO_VERSION_LIMITS.introduction) {
      return fail("The introduction cannot exceed 5,000 characters.");
    }
  }

  if (own(input, "selectedProjects")) {
    if (
      !Array.isArray(input.selectedProjects) ||
      input.selectedProjects.length > MAX_VERSION_PROJECTS
    ) {
      return fail("Select no more than 20 projects.");
    }

    const seen = new Set();

    for (const project of input.selectedProjects) {
      if (
        !project ||
        typeof project !== "object" ||
        Array.isArray(project) ||
        Object.keys(project).some(key =>
          !["source", "identityType", "projectId"].includes(key)
        )
      ) {
        return fail("Invalid project selection.");
      }

      const { source, identityType, projectId } = project;

      if (
        !["talent", "resume"].includes(source) ||
        typeof projectId !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(projectId)
      ) {
        return fail("Invalid project reference.");
      }

      if (
        source === "resume" &&
        identityType !== "subdocumentId"
      ) {
        return fail("Invalid Resume project reference.");
      }

      if (
        source === "talent" &&
        !["subdocumentId", "portfolioItemId"].includes(identityType)
      ) {
        return fail("Invalid Talent project reference.");
      }

      const key = JSON.stringify([source, identityType, projectId]);

      if (seen.has(key)) {
        return fail("A project cannot be selected more than once.");
      }

      seen.add(key);
    }

    value.selectedProjects = input.selectedProjects.map(project => ({
      source: project.source,
      identityType: project.identityType,
      projectId: project.projectId,
    }));
  }

  return { value };
}

function stringId(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function projectReferenceKey(project) {
  return JSON.stringify([
    project.source,
    project.identityType,
    project.projectId,
  ]);
}

function projectDescription(row) {
  return cleanText(row?.description || row?.overview || "");
}

function projectImage(row, source) {
  const candidate = source === "resume"
    ? row?.url || row?.images?.[0]?.url
    : row?.imageUrl || row?.images?.[0]?.url;

  return publicImageUrl(candidate);
}

// Builds a selectable list from the Talent's existing project records.
// It never modifies or saves either source document.
export function buildPortfolioProjectCatalog(talent, resume, ownerId) {
  const projects = [];
  let unavailableProjects = 0;

  const talentRows = Array.isArray(talent?.portfolio)
    ? talent.portfolio
    : [];

  const portfolioIds = new Map();
  const talentDocumentIds = new Map();

  for (const row of talentRows) {
    const portfolioId = cleanText(row?.portfolioItemId);
    const documentId = stringId(row?._id);

    if (portfolioId) {
      portfolioIds.set(
        portfolioId,
        (portfolioIds.get(portfolioId) || 0) + 1
      );
    }

    if (documentId) {
      talentDocumentIds.set(
        documentId,
        (talentDocumentIds.get(documentId) || 0) + 1
      );
    }
  }

  for (const row of talentRows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      unavailableProjects++;
      continue;
    }

    const portfolioId = cleanText(row.portfolioItemId);
    const documentId = stringId(row._id);

    // Prefer the embedded _id when unique. It survives the existing
    // Talent draft save flow, even when portfolioItemId is added later.
    let identityType = "";
    let projectId = "";

    if (
      documentId &&
      /^[a-f\d]{24}$/i.test(documentId) &&
      talentDocumentIds.get(documentId) === 1
    ) {
      identityType = "subdocumentId";
      projectId = documentId;
    } else if (
      portfolioId &&
      portfolioIds.get(portfolioId) === 1
    ) {
      identityType = "portfolioItemId";
      projectId = portfolioId;
    }

    if (!projectId) {
      unavailableProjects++;
      continue;
    }

    projects.push({
      source: "talent",
      identityType,
      projectId,
      title: cleanText(row.title) || "Untitled project",
      description: projectDescription(row),
      imageUrl: projectImage(row, "talent"),
      featured: row.featured === true,
    });
  }

  // Normalize legacy Resume gallery identities in memory using the same
  // owner-scoped strategy as the existing Resume editor.
  const resumeRows = normalizePortfolioImages(
    resume?.portfolioImages || [],
    ownerId
  );

  const resumeDocumentIds = new Map();

  for (const row of resumeRows) {
    const id = stringId(row?._id);

    if (id) {
      resumeDocumentIds.set(id, (resumeDocumentIds.get(id) || 0) + 1);
    }
  }

  for (const row of resumeRows) {
    const projectId = stringId(row?._id);

    if (!projectId || resumeDocumentIds.get(projectId) !== 1) {
      unavailableProjects++;
      continue;
    }

    projects.push({
      source: "resume",
      identityType: "subdocumentId",
      projectId,
      title: cleanText(row.title) || "Untitled project",
      description: projectDescription(row),
      imageUrl: projectImage(row, "resume"),
      featured: row.featured === true,
    });
  }

  return { projects, unavailableProjects };
}

export function validatePortfolioVersionProjects(selectedProjects, catalog) {
  const available = new Set(
    catalog.projects.map(projectReferenceKey)
  );

  for (const project of selectedProjects || []) {
    if (!available.has(projectReferenceKey(project))) {
      return "One or more selected projects are no longer available. Refresh your project list and review the selections.";
    }
  }

  return "";
}
