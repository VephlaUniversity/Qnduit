import mongoose from "mongoose";
import Talent from "../models/Talent.js";
import TalentEnquiry from "../models/TalentEnquiry.js";

import { resolveSubscriptionStatus } from "../services/subscriptionStatus.js";
import { findPublishedPortfolio } from "../services/publicTalentAccess.js";

import {
  defaultPortfolioEngagement,
  normalizePortfolioEngagement,
} from "../utils/portfolioEngagement.js";

const getPaidEligibility = async accountId => {
  const status = await resolveSubscriptionStatus({
    accountId,
    role: "talent",
  });

  return status.eligibility?.talentPublicProfile === true;
};

const paidAccessRequired = res => res.status(403).json({
  success: false,
  code: "PAID_SUBSCRIPTION_REQUIRED",
  message: "An active paid Talent subscription is required for this feature.",
});

const validId = value =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// --------------------------------------------------
// GET PORTFOLIO ENGAGEMENT SETTINGS
// --------------------------------------------------

export const getPortfolioEngagement = async (req, res, next) => {
  try {
    if (!await getPaidEligibility(req.user._id)) {
      return paidAccessRequired(res);
    }

    const talent = await Talent.findById(req.user._id)
      .select("portfolioEngagement")
      .lean();

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent account not found.",
      });
    }

    const normalized = normalizePortfolioEngagement(
      talent.portfolioEngagement || defaultPortfolioEngagement()
    );

    return res.json({
      success: true,
      settings: normalized.value || defaultPortfolioEngagement(),
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE PORTFOLIO ENGAGEMENT SETTINGS
// --------------------------------------------------

export const updatePortfolioEngagement = async (req, res, next) => {
  try {
    if (!await getPaidEligibility(req.user._id)) {
      return paidAccessRequired(res);
    }

    const normalized = normalizePortfolioEngagement(req.body);

    if (normalized.error) {
      return res.status(400).json({
        success: false,
        message: normalized.error,
      });
    }

    const talent = await Talent.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          portfolioEngagement: normalized.value,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("portfolioEngagement")
      .lean();

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent account not found.",
      });
    }

    return res.json({
      success: true,
      message: "Portfolio engagement settings saved.",
      settings: talent.portfolioEngagement,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// CURSOR HELPERS FOR ENQUIRY INBOX
// --------------------------------------------------

const encodeEnquiryCursor = enquiry =>
  Buffer.from(
    JSON.stringify({
      date: enquiry.createdAt.toISOString(),
      id: String(enquiry._id),
    })
  ).toString("base64url");

const decodeEnquiryCursor = value => {
  if (
    typeof value !== "string" ||
    value.length > 300 ||
    !/^[a-zA-Z0-9_-]+$/.test(value)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    const date = new Date(parsed.date);

    if (
      !Number.isFinite(date.getTime()) ||
      !validId(parsed.id)
    ) {
      return null;
    }

    return {
      date,
      id: new mongoose.Types.ObjectId(parsed.id),
    };
  } catch {
    return null;
  }
};

// --------------------------------------------------
// GET TALENT ENQUIRIES
// --------------------------------------------------

export const getTalentEnquiries = async (req, res, next) => {
  try {
    if (!await getPaidEligibility(req.user._id)) {
      return paidAccessRequired(res);
    }

    const limit = Number.parseInt(req.query.limit, 10) || 20;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: "Enquiry page size must be between 1 and 50.",
      });
    }

    const status = req.query.status || "all";

    if (!["all", "new", "read", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry status filter.",
      });
    }

    const filter = {
      talent: req.user._id,
      ...(status !== "all" ? { status } : {}),
    };

    if (req.query.before !== undefined) {
      const cursor = decodeEnquiryCursor(req.query.before);

      if (!cursor) {
        return res.status(400).json({
          success: false,
          message: "Invalid enquiry pagination cursor.",
        });
      }

      filter.$or = [
        { createdAt: { $lt: cursor.date } },
        {
          createdAt: cursor.date,
          _id: { $lt: cursor.id },
        },
      ];
    }

    const [rows, unreadCount] = await Promise.all([
      TalentEnquiry.find(filter)
        .select("_id senderName senderEmail message status createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean(),

      TalentEnquiry.countDocuments({
        talent: req.user._id,
        status: "new",
      }),
    ]);

    const hasMore = rows.length > limit;
    const enquiries = hasMore ? rows.slice(0, limit) : rows;

    return res.json({
      success: true,
      enquiries,
      unreadCount,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore
          ? encodeEnquiryCursor(enquiries.at(-1))
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE ENQUIRY STATUS
// --------------------------------------------------

export const updateTalentEnquiryStatus = async (req, res, next) => {
  try {
    if (!await getPaidEligibility(req.user._id)) {
      return paidAccessRequired(res);
    }

    const { id } = req.params;
    const { status } = req.body || {};

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry reference.",
      });
    }

    if (!["new", "read", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid enquiry status.",
      });
    }

    // Ownership is part of the database filter. A Talent cannot
    // access or update another Talent's enquiries.
    const enquiry = await TalentEnquiry.findOneAndUpdate(
      {
        _id: id,
        talent: req.user._id,
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("_id senderName senderEmail message status createdAt")
      .lean();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }

    return res.json({
      success: true,
      enquiry,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// PUBLIC CONTACT FORM SUBMISSION
// --------------------------------------------------

export const submitPublicTalentEnquiry = async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object"
      ? req.body
      : {};

    // Simple honeypot. Automated submissions that fill this field
    // receive a generic success response without being stored.
    if (
      typeof body.website === "string" &&
      body.website.trim()
    ) {
      return res.status(202).json({
        success: true,
        message: "Your enquiry has been submitted.",
      });
    }

    const senderName = typeof body.senderName === "string"
      ? body.senderName.trim().replace(/\s+/g, " ")
      : "";

    const senderEmail = typeof body.senderEmail === "string"
      ? body.senderEmail.trim().toLowerCase()
      : "";

    const message = typeof body.message === "string"
      ? body.message.trim()
      : "";

    if (
      !senderName ||
      senderName.length > 100 ||
      /[\u0000-\u001F\u007F]/.test(senderName)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name.",
      });
    }

    if (
      senderEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(senderEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (
      message.length < 10 ||
      message.length > 3000 ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)
    ) {
      return res.status(400).json({
        success: false,
        message: "Your enquiry must contain between 10 and 3,000 characters.",
      });
    }

    const published = await findPublishedPortfolio(
      req.params.username,
      "_id username portfolioEngagement"
    );

    if (
      !published ||
      published.publication.subscriptionStatus?.eligibility
        ?.talentPublicProfile !== true ||
      published.talent.portfolioEngagement?.contactFormEnabled !== true
    ) {
      return res.status(404).json({
        success: false,
        message: "Enquiries are unavailable for this profile.",
      });
    }

    await TalentEnquiry.create({
      talent: published.talent._id,
      senderName,
      senderEmail,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
    });
  } catch (error) {
    next(error);
  }
};