import {
  PORTFOLIO_TEXT_LIMITS, portfolioExternalUrl, portfolioVideoUrl, validPortfolioImages,
} from "../utils/portfolioMetadata.js";

// Both existing project sources use the same additive fields. Undefined defaults
// keep absent legacy values distinguishable from explicit clears on hydration.
export function portfolioCaseStudyFields() {
  const strings = () => ({
    type: [String],
    default: undefined,
    validate: value => value === undefined || value.length <= 20
      && value.every(item => item.length <= 80),
  });
  return {
    ...Object.fromEntries(Object.entries(PORTFOLIO_TEXT_LIMITS)
      .filter(([key]) => !["title", "description"].includes(key))
      .map(([key, maxlength]) => [key, { type: String, maxlength }])),
    toolsUsed: strings(),
    skillsDemonstrated: strings(),
    images: {
      type: [{
        _id: { type: String, required: true },
        url: { type: String, required: true },
        public_id: { type: String, maxlength: 255 },
        alt: { type: String, maxlength: 300 },
        caption: { type: String, maxlength: 500 },
        comparisonLabel: { type: String, enum: ["", "before", "after"] },
      }],
      default: undefined,
      validate: value => value === undefined || validPortfolioImages(value),
    },
    links: {
      type: [{
        _id: false,
        label: { type: String, required: true, trim: true, maxlength: 80 },
        url: {
          type: String, required: true, maxlength: 2048,
          validate: value => Boolean(portfolioExternalUrl(value)),
        },
      }],
      default: undefined,
      validate: value => value === undefined || value.length <= 5,
    },
    video: {
      type: String, maxlength: 2048,
      validate: value => value === undefined || value === "" || Boolean(portfolioVideoUrl(value)),
    },
    featured: { type: Boolean, default: undefined },
  };
}
