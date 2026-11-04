import Activity from "../models/ExternalApplicationActivity.js";
import { externalActivityCountStages } from "./externalActivityCounts.js";

// Identity always comes from authentication, never query/body owner parameters.
export function employerExternalActivityPipeline(employerId, jobIds) {
  return [
    { $match: { posterId: employerId, posterType: "Employer", source: "employer",
      ...(jobIds ? { jobId: { $in: jobIds } } : {}) } },
    // Two group stages avoid building an unbounded array of Talent IDs.
    ...externalActivityCountStages(jobIds ? { jobId: "$jobId", talentId: "$talentId" } : "$talentId",
      { bucket: jobIds ? "$_id.jobId" : null }),
    { $project: { _id: 0, ...(jobIds ? { jobId: { $toString: "$_id" } } : {}),
      externalTalents: 1, externalClicks: 1 } },
  ];
}

export async function employerExternalJobFigures(employerId, jobIds) {
  if (!jobIds.length) return new Map();
  const rows = await Activity.aggregate(employerExternalActivityPipeline(employerId, jobIds));
  return new Map(rows.map(({ jobId, ...figures }) => [jobId, figures]));
}

export async function employerExternalTotals(employerId) {
  const [totals] = await Activity.aggregate(employerExternalActivityPipeline(employerId));
  return totals || { externalTalents: 0, externalClicks: 0 };
}
