import { jobApplicationConfiguration } from "./jobApplicationConfiguration.js";

// Keep invalid/unknown methods distinct from Internal; never provide an unsafe URL.
export function jobApplicationMetadata(job) {
  const applicationType = job.applicationType ?? "internal";
  const { errors, configuration } = jobApplicationConfiguration({}, job);
  return { applicationType, applicationUrl: Object.keys(errors).length ? "" : configuration.applicationUrl };
}
export const usesInternalApplications = job => (job.applicationType ?? "internal") === "internal";
// Compose under $and: public availability already has a deadline $or.
export const internalApplicationFilter = () => ({ applicationType: { $in: ["internal", null] } });
