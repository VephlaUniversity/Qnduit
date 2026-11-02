import mongoose from "mongoose";
import { createHash } from "node:crypto";
import ExternalApplicationActivity, { assertExternalActivityReady } from "../models/ExternalApplicationActivity.js";
import Job from "../models/Job.js";
import AdminJob from "../models/AdminJob.js";
import Employer from "../models/Employer.js";
import { openJobFilter } from "../services/jobVisibility.js";
import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration.js";

const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const text = value => typeof value === "string" ? value : "";
const activityResponse = row => ({
  _id: String(row._id), kind: "external", talentId: String(row.talentId), intentId: row.intentId,
  jobId: String(row.jobId), source: row.source, posterId: String(row.posterId), posterType: row.posterType,
  destinationUrl: row.destinationUrl, clickedAt: row.clickedAt,
  display: Object.fromEntries(["jobTitle", "companyName", "location", "category", "workType", "jobApplyType"]
    .map(key => [key, text(row.display?.[key])])),
});

export async function recordExternalApplicationActivity(req, res) {
  try {
    const body = req.body || {};
    const { jobId, source, expectedDestination, intentId } = body;
    if (Object.keys(body).some(key => !["jobId", "source", "expectedDestination", "intentId"].includes(key)) ||
      typeof jobId !== "string" || !/^[a-f\d]{24}$/i.test(jobId) ||
      !["employer", "admin"].includes(source) || source !== req.jobSource ||
      typeof intentId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(intentId) ||
      typeof expectedDestination !== "string" || Object.keys(jobApplicationConfiguration({ applicationType: "external", applicationUrl: expectedDestination }).errors).length) {
      throw fail(400, "EXTERNAL_ACTIVITY_INVALID", "Provide a job ID, explicit source, UUID v4 intent ID and valid expected destination.");
    }
    await assertExternalActivityReady();
    const identity = { talentId: req.user._id, intentId: intentId.toLowerCase() };
    const replay = row => {
      if (String(row.jobId) !== jobId.toLowerCase() || row.source !== source || row.destinationUrl !== expectedDestination) {
        throw fail(409, "EXTERNAL_ACTIVITY_INTENT_CONFLICT", "This intent ID was already used for a different activity.");
      }
      return res.status(200).json({ success: true, replayed: true, activity: activityResponse(row) });
    };
    // Retry comparison uses the immutable recorded destination, not today's job.
    const existing = await ExternalApplicationActivity.findOne(identity).lean();
    if (existing) return replay(existing);
    const Model = source === "admin" ? AdminJob : Job;
    const job = await Model.findOne({ _id: jobId, ...openJobFilter(), applicationType: "external" })
      .select("employer postedBy organization jobTitle location category workType jobApplyType applicationType applicationUrl")
      .lean();
    if (!job) throw fail(404, "EXTERNAL_ACTIVITY_JOB_UNAVAILABLE", "This external job is no longer available.");
    const { configuration, errors } = jobApplicationConfiguration({}, job);
    if (Object.keys(errors).length) throw fail(404, "EXTERNAL_ACTIVITY_JOB_UNAVAILABLE", "This external job is no longer available.");
    if (configuration.applicationUrl !== expectedDestination) {
      throw fail(409, "EXTERNAL_ACTIVITY_DESTINATION_CHANGED", "The application destination has changed. Refresh the job before trying again.");
    }
    const posterId = source === "admin" ? job.postedBy : job.employer;
    if (!mongoose.isObjectIdOrHexString(posterId)) throw fail(404, "EXTERNAL_ACTIVITY_JOB_UNAVAILABLE", "This external job is no longer available.");
    const employer = source === "employer" ? await Employer.findById(posterId).select("companyName displayName accountType").lean() : null;
    const activity = {
      _id: createHash("sha256").update(`external-activity:${identity.talentId}:${identity.intentId}`).digest("hex"),
      ...identity, jobId: job._id, source, posterId, posterType: source === "admin" ? "Admin" : "Employer",
      destinationUrl: configuration.applicationUrl,
      // Server receipt/recording time, not a claim that an external form completed.
      clickedAt: new Date(),
      display: {
        jobTitle: text(job.jobTitle),
        companyName: source === "admin" ? text(job.organization) :
          text(employer?.accountType === "individual" ? employer.displayName || employer.companyName : employer?.companyName),
        location: text(job.location), category: text(job.category), workType: text(job.workType), jobApplyType: text(job.jobApplyType),
      },
    };
    try {
      const row = await ExternalApplicationActivity.create(activity);
      return res.status(201).json({ success: true, replayed: false, activity: activityResponse(row) });
    } catch {
      // Covers concurrent inserts AND a committed insert whose acknowledgement
      // was lost. The retry's payload must still match the winning record.
      const committed = await ExternalApplicationActivity.findOne(identity).lean();
      if (committed) return replay(committed);
      throw fail(503, "EXTERNAL_ACTIVITY_RECORDING_UNAVAILABLE", "Activity recording could not be confirmed. Retry using the same intent ID.");
    }
  } catch (error) {
    return res.status(error.status || 503).json({ success: false,
      code: error.code && error.status ? error.code : "EXTERNAL_ACTIVITY_RECORDING_UNAVAILABLE",
      message: error.status ? error.message : "Activity recording is temporarily unavailable. Retry using the same intent ID.",
    });
  }
}
