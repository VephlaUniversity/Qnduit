import Activity from "../models/ExternalApplicationActivity.js";
import JobApplication from "../models/JobApplication.js";
import AdminJobApplication from "../models/AdminJobApplication.js";
import { externalActivityCountStages } from "./externalActivityCounts.js";

export async function talentApplicationSummary(talentId) {
  const [employerInternal, adminInternal, external] = await Promise.all([
    JobApplication.countDocuments({ applicantId: talentId }),
    AdminJobApplication.countDocuments({ applicantId: talentId }),
    Activity.aggregate([
      { $match: { talentId } },
      ...externalActivityCountStages({ jobId: "$jobId", source: "$source" },
        { distinctField: "externalJobGroups", clicksField: "externalOpens" }),
      { $project: { _id: 0, externalJobGroups: 1, externalOpens: 1 } },
    ]),
  ]);
  return { totalApplications: employerInternal + adminInternal,
    ...(external[0] || { externalJobGroups: 0, externalOpens: 0 }) };
}
