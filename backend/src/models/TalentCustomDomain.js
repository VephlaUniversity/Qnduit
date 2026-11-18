import mongoose from "mongoose";

const dnsRecordSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, uppercase: true },
    name: { type: String, trim: true },
    value: { type: String, trim: true },
    status: { type: String, trim: true },
  },
  { _id: false }
);

const talentCustomDomainSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
    },
    hostname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "pending_verification",
        "pending_ssl",
        "active",
        "failed",
        "disconnected",
      ],
      default: "pending_verification",
      index: true,
    },
    isClaimed: {
      type: Boolean,
      default: true,
    },
    cloudflareHostnameId: {
      type: String,
      default: null,
    },
    ownershipVerification: {
      type: dnsRecordSchema,
      default: null,
    },
    sslValidationRecords: {
      type: [dnsRecordSchema],
      default: [],
    },
    hostnameStatus: {
      type: String,
      default: "pending",
    },
    sslStatus: {
      type: String,
      default: "pending",
    },
    cnameTarget: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },
    verifiedAt: Date,
    activatedAt: Date,
    disconnectedAt: Date,
    lastCheckedAt: Date,
  },
  { timestamps: true }
);

// A hostname can only be claimed once.
talentCustomDomainSchema.index(
  { hostname: 1 },
  {
    unique: true,
    partialFilterExpression: { isClaimed: true },
    name: "unique_claimed_hostname",
  }
);

// A talent can only have one claimed domain.
talentCustomDomainSchema.index(
  { talent: 1 },
  {
    unique: true,
    partialFilterExpression: { isClaimed: true },
    name: "unique_claimed_talent_domain",
  }
);

// Efficient lookup for public hostname resolution.
talentCustomDomainSchema.index(
  { hostname: 1, status: 1, isClaimed: 1 },
  { name: "active_hostname_lookup" }
);

export default mongoose.model(
  "TalentCustomDomain",
  talentCustomDomainSchema
);