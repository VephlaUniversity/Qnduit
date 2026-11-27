
import mongoose from "mongoose";

const selectedProjectSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["talent", "resume"],
      required: true,
    },
    identityType: {
      type: String,
      enum: ["subdocumentId", "portfolioItemId"],
      required: true,
    },
    projectId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false }
);

const talentPortfolioVersionSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 64,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    targetRole: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    introduction: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    // These are references to existing project records, not copies.
    // Array order is the order selected by the Talent.
    selectedProjects: {
      type: [selectedProjectSchema],
      default: [],
      validate: {
        validator: projects => {
          if (!Array.isArray(projects) || projects.length > 20) {
            return false;
          }

          const references = projects.map(project =>
            JSON.stringify([
              project.source,
              project.identityType,
              project.projectId,
            ])
          );

          return new Set(references).size === references.length;
        },
        message: "A version can contain at most 20 unique projects.",
      },
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// A Talent cannot have two versions with the same URL slug.
talentPortfolioVersionSchema.index(
  { talent: 1, slug: 1 },
  {
    unique: true,
    name: "talent_portfolio_version_slug_unique",
  }
);

talentPortfolioVersionSchema.index(
  { talent: 1, updatedAt: -1 },
  { name: "talent_portfolio_versions_owner_updated" }
);

export default mongoose.models.TalentPortfolioVersion ||
  mongoose.model("TalentPortfolioVersion", talentPortfolioVersionSchema);
