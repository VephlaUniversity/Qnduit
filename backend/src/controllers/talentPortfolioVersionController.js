
import mongoose from "mongoose";

import Talent from "../models/Talent.js";
import Resume from "../models/Resume.js";
import TalentPortfolioVersion from "../models/TalentPortfolioVersion.js";

import { resolveSubscriptionStatus } from "../services/subscriptionStatus.js";
import { findPublishedPortfolio } from "../services/publicTalentAccess.js";

import {
  MAX_VERSION_PROJECTS,
  buildPortfolioProjectCatalog,
  normalizePortfolioVersionInput,
  portfolioVersionSlug,
  validatePortfolioVersionProjects,
} from "../utils/talentPortfolioVersions.js";

const validId = value =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const paidAccessRequired = res => res.status(403).json({
  success: false,
  code: "PAID_SUBSCRIPTION_REQUIRED",
  message: "An active paid Talent subscription is required for targeted portfolio versions.",
});

const getPaidEligibility = async accountId => {
  const status = await resolveSubscriptionStatus({
    accountId,
    role: "talent",
  });

  return status.eligibility?.talentPublicProfile === true;
};

const requirePaidAccess = async (req, res) => {
  if (!await getPaidEligibility(req.user._id)) {
    paidAccessRequired(res);
    return false;
  }

  return true;
};

const slugConflict = error =>
  error?.code === 11000 &&
  (
    error.keyPattern?.slug === 1 ||
    error.keyPattern?.talent === 1 ||
    error.message?.includes("talent_portfolio_version_slug_unique")
  );

const versionNotFound = res => res.status(404).json({
  success: false,
  message: "Portfolio version not found.",
});

const serializeVersion = (version, username) => {
  const row = typeof version.toObject === "function"
    ? version.toObject()
    : version;

  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    targetRole: row.targetRole || "",
    introduction: row.introduction || "",
    selectedProjects: row.selectedProjects || [],
    status: row.status,
    publishedAt: row.publishedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sharePath: row.status === "published" && username
      ? `/portfolio/${encodeURIComponent(username)}/${encodeURIComponent(row.slug)}`
      : null,
  };
};

// Load current project records without modifying either collection.
const loadOwnerProjectState = async ownerId => {
  const talent = await Talent.collection.findOne(
    { _id: ownerId },
    { projection: { username: 1, portfolio: 1 } }
  );

  if (!talent) {
    throw Object.assign(new Error("Talent account not found."), {
      statusCode: 404,
    });
  }

  const resumeCount = await Resume.collection.countDocuments(
    { talent: ownerId },
    { limit: 2 }
  );

  if (resumeCount > 1) {
    throw Object.assign(
      new Error("Multiple Resume records need review. Your project selections have not been changed."),
      { statusCode: 409 }
    );
  }

  const resume = resumeCount === 1
    ? await Resume.collection.findOne({ talent: ownerId })
    : null;

  const catalog = buildPortfolioProjectCatalog(talent, resume, ownerId);

  return { talent, resume, catalog };
};

// --------------------------------------------------
// GET TALENT PORTFOLIO VERSIONS
// --------------------------------------------------

export const getTalentPortfolioVersions = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const talent = await Talent.collection.findOne(
      { _id: req.user._id },
      { projection: { username: 1 } }
    );

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent account not found.",
      });
    }

    const versions = await TalentPortfolioVersion.find({
      talent: req.user._id,
    })
      .sort({ updatedAt: -1, _id: -1 })
      .lean();

    res.set("Cache-Control", "private, no-store");

    return res.json({
      success: true,
      versions: versions.map(version =>
        serializeVersion(version, talent.username)
      ),
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET EXISTING PROJECTS AVAILABLE FOR SELECTION
// --------------------------------------------------

export const getPortfolioVersionProjects = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const { catalog } = await loadOwnerProjectState(req.user._id);

    res.set("Cache-Control", "private, no-store");

    return res.json({
      success: true,
      projects: catalog.projects,
      unavailableProjects: catalog.unavailableProjects,
      maxSelectedProjects: MAX_VERSION_PROJECTS,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// CREATE A PORTFOLIO VERSION
// --------------------------------------------------

export const createTalentPortfolioVersion = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const normalized = normalizePortfolioVersionInput(req.body);

    if (normalized.error) {
      return res.status(400).json({
        success: false,
        message: normalized.error,
      });
    }

    const value = normalized.value;

    // Generate the initial slug from the title unless the owner supplied one.
    const slug = value.slug || portfolioVersionSlug(value.title);

    if (!slug || slug.length < 2) {
      return res.status(400).json({
        success: false,
        message: "The title cannot produce a valid URL slug. Enter a different title or supply a slug.",
      });
    }

    const { talent, catalog } = await loadOwnerProjectState(req.user._id);

    const selectionError = validatePortfolioVersionProjects(
      value.selectedProjects || [],
      catalog
    );

    if (selectionError) {
      return res.status(409).json({
        success: false,
        code: "PORTFOLIO_PROJECT_SELECTION_STALE",
        message: selectionError,
      });
    }

    const version = await TalentPortfolioVersion.create({
      talent: req.user._id,
      title: value.title,
      slug,
      targetRole: value.targetRole || "",
      introduction: value.introduction || "",
      selectedProjects: value.selectedProjects || [],
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Portfolio version created.",
      version: serializeVersion(version, talent.username),
    });
  } catch (error) {
    if (slugConflict(error)) {
      return res.status(409).json({
        success: false,
        code: "PORTFOLIO_VERSION_SLUG_TAKEN",
        message: "You already have a portfolio version with this URL slug. Choose another slug.",
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// UPDATE A PORTFOLIO VERSION
// --------------------------------------------------

export const updateTalentPortfolioVersion = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio version reference.",
      });
    }

    const normalized = normalizePortfolioVersionInput(req.body, {
      partial: true,
    });

    if (normalized.error) {
      return res.status(400).json({
        success: false,
        message: normalized.error,
      });
    }

    const version = await TalentPortfolioVersion.findOne({
      _id: new mongoose.Types.ObjectId(id),
      talent: req.user._id,
    });

    if (!version) return versionNotFound(res);

    const value = normalized.value;

    // Validate new selections against the owner's current saved projects.
    // Unchanged selections do not need to be resubmitted.
    if (value.selectedProjects !== undefined) {
      const { catalog } = await loadOwnerProjectState(req.user._id);

      const selectionError = validatePortfolioVersionProjects(
        value.selectedProjects,
        catalog
      );

      if (selectionError) {
        return res.status(409).json({
          success: false,
          code: "PORTFOLIO_PROJECT_SELECTION_STALE",
          message: selectionError,
        });
      }
    }

    version.set(value);
    await version.save();

    const talent = await Talent.collection.findOne(
      { _id: req.user._id },
      { projection: { username: 1 } }
    );

    return res.json({
      success: true,
      message: "Portfolio version updated.",
      version: serializeVersion(version, talent?.username),
    });
  } catch (error) {
    if (slugConflict(error)) {
      return res.status(409).json({
        success: false,
        code: "PORTFOLIO_VERSION_SLUG_TAKEN",
        message: "You already have a portfolio version with this URL slug. Choose another slug.",
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// PUBLISH A PORTFOLIO VERSION
// --------------------------------------------------

export const publishTalentPortfolioVersion = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio version reference.",
      });
    }

    const version = await TalentPortfolioVersion.findOne({
      _id: new mongoose.Types.ObjectId(id),
      talent: req.user._id,
    });

    if (!version) return versionNotFound(res);

    if (
      !version.targetRole ||
      version.targetRole.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Add a target role before publishing this version.",
      });
    }

    if (
      !version.introduction ||
      version.introduction.trim().length < 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Your introduction must contain at least 20 characters before publishing.",
      });
    }

    if (
      !version.selectedProjects?.length ||
      version.selectedProjects.length > MAX_VERSION_PROJECTS
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one project before publishing.",
      });
    }

    const { talent, catalog } = await loadOwnerProjectState(req.user._id);

    const selectionError = validatePortfolioVersionProjects(
      version.selectedProjects,
      catalog
    );

    if (selectionError) {
      return res.status(409).json({
        success: false,
        code: "PORTFOLIO_PROJECT_SELECTION_STALE",
        message: selectionError,
      });
    }

    // Targeted versions are extensions of an existing published public
    // portfolio, not a way to bypass the owner's publication settings.
    const publishedPortfolio = talent.username
      ? await findPublishedPortfolio(talent.username, "_id username")
      : null;

    if (!publishedPortfolio) {
      return res.status(409).json({
        success: false,
        code: "PUBLIC_PORTFOLIO_REQUIRED",
        message: "Publish your main public portfolio before publishing a targeted version.",
      });
    }

    version.status = "published";
    version.publishedAt = version.publishedAt || new Date();

    await version.save();

    return res.json({
      success: true,
      message: "Portfolio version published.",
      version: serializeVersion(version, talent.username),
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UNPUBLISH A PORTFOLIO VERSION
// --------------------------------------------------

export const unpublishTalentPortfolioVersion = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio version reference.",
      });
    }

    const version = await TalentPortfolioVersion.findOne({
      _id: new mongoose.Types.ObjectId(id),
      talent: req.user._id,
    });

    if (!version) return versionNotFound(res);

    version.status = "draft";
    version.publishedAt = null;

    await version.save();

    const talent = await Talent.collection.findOne(
      { _id: req.user._id },
      { projection: { username: 1 } }
    );

    return res.json({
      success: true,
      message: "Portfolio version unpublished.",
      version: serializeVersion(version, talent?.username),
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// DELETE A PORTFOLIO VERSION
// --------------------------------------------------

export const deleteTalentPortfolioVersion = async (req, res, next) => {
  try {
    if (!await requirePaidAccess(req, res)) return;

    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio version reference.",
      });
    }

    const deleted = await TalentPortfolioVersion.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      talent: req.user._id,
    });

    if (!deleted) return versionNotFound(res);

    return res.json({
      success: true,
      message: "Portfolio version deleted.",
    });
  } catch (error) {
    next(error);
  }
};
