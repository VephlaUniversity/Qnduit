import { jobApplicationConfiguration } from "./jobApplicationConfiguration";
import { jobDateKey, lagosDateKey } from "./jobDeadline";

export function jobApplicationAction(job, now = new Date()) {
  if (!job || job.status !== "published" || job.isDeleted !== false) return { kind: "unavailable" };
  const deadline = jobDateKey(job.deadlineDate);
  if (job.deadlineDate && (!deadline || deadline < lagosDateKey(now))) return { kind: "unavailable" };
  const { errors, configuration } = jobApplicationConfiguration({}, job);
  if (Object.keys(errors).length) return { kind: "unavailable" };
  return configuration.applicationType === "external"
    ? { kind: "external", url: configuration.applicationUrl }
    : { kind: "internal" };
}
