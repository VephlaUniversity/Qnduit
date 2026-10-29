import { jobApplicationMetadata } from "../utils/jobApplicationMetadata.js";
import AdminJob from "../models/AdminJob.js";
import { lagosDateKey } from "../utils/jobDeadline.js";

export const availableAdminJob = () => ({ status: "published", isDeleted: false,
  $or: [{ deadlineDate: null }, { deadlineDate: { $exists: false } },
    { deadlineDate: { $gte: new Date(`${lagosDateKey()}T00:00:00.000Z`) } }],
});
// Deliberate public allowlist: no postedBy identity, private contact or storage IDs.
export function publicAdminJob(job) {
  const result = { ...jobApplicationMetadata(job), status: job.status, isDeleted: job.isDeleted, source: "admin", employer: { companyName: job.organization || "QNDUIT" }, planPriority: 4 };
  for (const key of ["_id", "jobTitle", "jobDescription", "organization", "category", "jobCategory", "jobApplyType", "workType", "experience", "careerLevel", "qualification", "address", "location", "salary", "deadlineDate", "createdAt"])
    if (job[key] !== undefined) result[key] = job[key];
  if (job.featuredImage?.url) result.featuredImage = { url: job.featuredImage.url };
  result.gallery = (job.gallery || []).filter(item => item.url).map(({ url, type }) => ({ url, type }));
  result.requirements = [];
  result.qualifications = job.qualification ? [job.qualification] : [];
  return result;
}
export async function findPublicAdminJob(id) {
  if (!/^[a-f\d]{24}$/i.test(id || "")) return null;
  const job = await AdminJob.findOne({ _id: id, ...availableAdminJob() }).lean();
  return job ? publicAdminJob(job) : null;
}
