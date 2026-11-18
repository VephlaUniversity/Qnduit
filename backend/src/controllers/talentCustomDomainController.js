import mongoose from "mongoose";
import TalentCustomDomain from "../models/TalentCustomDomain.js";
import { resolveTalentPublication } from "../services/talentPublication.js";
import { normalizeDomain } from "../utils/normalizeDomain.js";
import {
  createCloudflareHostname,
  getCloudflareHostname,
  deleteCloudflareHostname,
} from "../services/cloudflareSaasService.js";
import Talent from "../models/Talent.js";
import { getPublicTalentProfile } from "./talentController.js";
import { getPublicTalentCv } from "./publicTalentCvController.js";

const getTalentEligibility = async talentId => {
  const publication = await resolveTalentPublication(talentId);

  return publication?.subscriptionStatus?.paidEligible === true;
};

const getDomainResponse = domain => ({
  id: domain._id,
  hostname: domain.hostname,
  status: domain.status,
  hostnameStatus: domain.hostnameStatus,
  sslStatus: domain.sslStatus,
  ownershipVerification: domain.ownershipVerification,
  sslValidationRecords: domain.sslValidationRecords,
  cnameTarget: domain.cnameTarget,
  lastError: domain.lastError,
  createdAt: domain.createdAt,
  verifiedAt: domain.verifiedAt,
  activatedAt: domain.activatedAt,
});

const mapDnsRecord = record => {
  if (!record || typeof record !== "object") return null;

  return {
    type: record.type || null,
    name: record.name || record.hostname || null,
    value: record.value || record.target || null,
    status: record.status || null,
  };
};

const mapDnsRecords = records =>
  Array.isArray(records)
    ? records.map(mapDnsRecord).filter(Boolean)
    : [];

const handleError = (res, error, fallback) => {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "The domain information is invalid.",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This domain is already connected or being verified.",
    });
  }

  console.error(fallback, error);

  return res.status(500).json({
    success: false,
    message: fallback,
  });
};

async function resolveRequestingTalent(req) {
  const origin = req.get("origin");

  if (!origin) return null;

  let hostname;

  try {
    const parsed = new URL(origin);

    if (parsed.protocol !== "https:" || parsed.port) {
      return null;
    }

    hostname = parsed.hostname.toLowerCase();
  } catch {
    return null;
  }

  const domain = await TalentCustomDomain.findOne({
    hostname,
    status: "active",
    isClaimed: true,
  })
    .select("talent")
    .lean();

  if (!domain) return null;

  const publication = await resolveTalentPublication(domain.talent);

  if (publication?.subscriptionStatus?.paidEligible !== true) {
    return null;
  }

  const talent = await Talent.findById(domain.talent)
    .select("username")
    .lean();

  if (!talent?.username) return null;

  return talent;
}

// GET /api/talents/public-domain
export const getPublicTalentByDomain = async (req, res, next) => {
  try {
    const talent = await resolveRequestingTalent(req);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "This portfolio is unavailable.",
      });
    }

    req.params.username = talent.username;

    return getPublicTalentProfile(req, res, next);
  } catch (error) {
    return next(error);
  }
};

// GET /api/talents/public-domain/cvs/:cvId
export const getPublicTalentCvByDomain = async (req, res, next) => {
  try {
    const talent = await resolveRequestingTalent(req);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "This portfolio is unavailable.",
      });
    }

    req.params.username = talent.username;

    return getPublicTalentCv(req, res, next);
  } catch (error) {
    return next(error);
  }
};

// GET /api/talents/custom-domain
export const getMyCustomDomain = async (req, res) => {
  try {
    const publication = await resolveTalentPublication(req.user._id);

    const eligible =
      publication?.subscriptionStatus?.paidEligible === true;

    const domain = await TalentCustomDomain.findOne({
      talent: req.user._id,
      isClaimed: true,
    }).lean();

    return res.json({
      success: true,
      eligibleForCustomDomain: eligible,
      domain: domain ? getDomainResponse(domain) : null,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve your custom domain."
    );
  }
};

// POST /api/talents/custom-domain
export const connectCustomDomain = async (req, res) => {
  let domain;
  let cloudflareHostnameId;

  try {
    if (req.user.role !== "talent") {
      return res.status(403).json({
        success: false,
        message: "Talent account required.",
      });
    }

    const publication = await resolveTalentPublication(req.user._id);

    if (publication?.subscriptionStatus?.paidEligible !== true) {
      return res.status(403).json({
        success: false,
        code: "CUSTOM_DOMAIN_REQUIRES_PAID_PLAN",
        message: "An active paid talent subscription is required.",
      });
    }

    const hostname = normalizeDomain(req.body?.hostname);

    // Reserve first. The unique indexes enforce both constraints atomically.
    domain = await TalentCustomDomain.create({
      talent: req.user._id,
      hostname,
      status: "pending_verification",
      isClaimed: true,
    });

    const cloudflare = await createCloudflareHostname(
      hostname,
      req.user._id
    );

    cloudflareHostnameId = cloudflare.id;

    domain.cloudflareHostnameId = cloudflare.id;
    domain.hostnameStatus = cloudflare.status || "pending";
    domain.sslStatus = cloudflare.sslStatus || "pending";
    domain.ownershipVerification = mapDnsRecord(
      cloudflare.ownershipVerification
    );
    domain.sslValidationRecords = mapDnsRecords(
      cloudflare.sslValidationRecords
    );
    domain.cnameTarget = cloudflare.cnameTarget;

    await domain.save();

    return res.status(201).json({
      success: true,
      message: "Domain registered. Add the DNS records shown below.",
      domain: getDomainResponse(domain),
    });
  } catch (error) {
    if (domain && !cloudflareHostnameId) {
      // Cloudflare creation failed. Release the hostname reservation.
      await TalentCustomDomain.updateOne(
        { _id: domain._id },
        {
          $set: {
            isClaimed: false,
            status: "failed",
            lastError: "Cloudflare registration could not be completed.",
          },
        }
      ).catch(cleanupError =>
        console.error("Domain reservation cleanup failed:", cleanupError)
      );
    } else if (domain && cloudflareHostnameId) {
      // Cloudflare succeeded but persistence failed. Attempt provider cleanup.
      try {
        await deleteCloudflareHostname(cloudflareHostnameId);

        await TalentCustomDomain.updateOne(
          { _id: domain._id },
          {
            $set: {
              isClaimed: false,
              status: "failed",
              lastError: "Domain registration could not be completed.",
            },
          }
        );
      } catch (cleanupError) {
        // Keep the hostname claimed if Cloudflare still owns it.
        console.error("Cloudflare/domain cleanup requires attention:", cleanupError);
      }
    }

    if (error.code === 11000) {
      const existing = await TalentCustomDomain.findOne({
        talent: req.user._id,
        isClaimed: true,
      }).lean();

      return res.status(409).json({
        success: false,
        message: existing
          ? "You already have a domain connected or being verified."
          : "This hostname is already connected or being verified.",
      });
    }

    if (error.message?.includes("domain name")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Custom domain registration failed:", error);

    return res.status(502).json({
      success: false,
      message: "We could not register this domain right now. Please try again.",
    });
  }
};

// POST /api/talents/custom-domain/verify
export const verifyCustomDomain = async (req, res) => {
  try {
    if (req.user.role !== "talent") {
      return res.status(403).json({
        success: false,
        message: "Talent account required.",
      });
    }

    const domain = await TalentCustomDomain.findOne({
      talent: req.user._id,
      isClaimed: true,
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "You do not have a connected domain to verify.",
      });
    }

    const eligible = await getTalentEligibility(req.user._id);

    if (!eligible) {
      return res.status(403).json({
        success: false,
        code: "CUSTOM_DOMAIN_REQUIRES_PAID_PLAN",
        message: "Your subscription is no longer eligible for custom domains.",
        domain: getDomainResponse(domain),
      });
    }

    if (!domain.cloudflareHostnameId) {
      return res.status(409).json({
        success: false,
        message: "This domain is missing its Cloudflare registration. Please disconnect it and try again.",
      });
    }

    const latest = await getCloudflareHostname(domain.cloudflareHostnameId);

    const hostnameStatus = latest.status || "pending";
    const sslStatus = latest.ssl?.status || "pending";

    const isActive =
      hostnameStatus === "active" && sslStatus === "active";

    const isVerified = hostnameStatus === "active";

    domain.hostnameStatus = hostnameStatus;
    domain.sslStatus = sslStatus;
    domain.ownershipVerification = mapDnsRecord(
      latest.ownership_verification || domain.ownershipVerification
    );
    domain.sslValidationRecords = mapDnsRecords(
      latest.ssl?.validation_records || domain.sslValidationRecords
    );

    if (isVerified && !domain.verifiedAt) {
      domain.verifiedAt = new Date();
    }

    if (isActive) {
      domain.status = "active";
      domain.activatedAt ||= new Date();
      domain.lastError = null;
    } else if (
      ["moved", "deleted"].includes(hostnameStatus) ||
      ["failed", "deleted"].includes(sslStatus)
    ) {
      domain.status = "failed";
      domain.lastError = "Cloudflare could not activate this hostname. Check the DNS configuration.";
    } else if (isVerified) {
      domain.status = "pending_ssl";
      domain.lastError = null;
    } else {
      domain.status = "pending_verification";
      domain.lastError = null;
    }

    await domain.save();

    return res.json({
      success: true,
      message: isActive
        ? "Your custom domain is active and HTTPS is ready."
        : isVerified
          ? "Domain ownership is verified. SSL provisioning is still in progress."
          : "Domain verification is still pending. Check your DNS records and try again.",
      domain: getDomainResponse(domain),
    });
  } catch (error) {
    return handleError(res, error, "Unable to verify your custom domain.");
  }
};

// DELETE /api/talents/custom-domain
export const disconnectCustomDomain = async (req, res) => {
  try {
    if (req.user.role !== "talent") {
      return res.status(403).json({
        success: false,
        message: "Talent account required.",
      });
    }

    const domain = await TalentCustomDomain.findOne({
      talent: req.user._id,
      isClaimed: true,
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "No connected domain was found.",
      });
    }

    // Do not release the hostname in MongoDB unless Cloudflare deletion succeeds.
    if (domain.cloudflareHostnameId) {
      await deleteCloudflareHostname(domain.cloudflareHostnameId);
    }

    domain.isClaimed = false;
    domain.status = "disconnected";
    domain.disconnectedAt = new Date();
    domain.lastError = null;

    await domain.save();

    return res.json({
      success: true,
      message: "Your custom domain has been disconnected.",
    });
  } catch (error) {
    return handleError(res, error, "Unable to disconnect your custom domain.");
  }
};