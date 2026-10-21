import mongoose from "mongoose";
import Employer from "../models/Employer.js";
import Job from "../models/Job.js";
import { resolveSubscriptionStatus } from "./subscriptionStatus.js";

const FREE_JOB_LIMIT = 10;
const accessError = (message, status, code) => Object.assign(new Error(message), { status, code });

export async function checkEmployerJobAccess(employerId, { session = null } = {}) {
  try {
    const subscription = await resolveSubscriptionStatus({ accountId: employerId, role: "employer", session });
    if (["missing", "inactive"].includes(subscription.status) &&
      ["account_missing", "account_inactive"].includes(subscription.reason)) {
      throw accessError("Job posting is unavailable for this account.", 403, "JOB_POSTING_UNAVAILABLE");
    }
    if (!subscription.eligibility.unlimitedJobPosting) {
      const count = await Job.countDocuments({ employer: employerId }).session(session);
      if (count >= FREE_JOB_LIMIT) {
        throw accessError("Your Free account has reached its limit of 10 stored jobs. Choose a paid plan to post more.", 403, "JOB_POST_LIMIT_REACHED");
      }
    }
  } catch (error) {
    if (error.status) throw error;
    throw accessError("Job posting is temporarily unavailable.", 503, "JOB_POSTING_SERVICE_UNAVAILABLE");
  }
}

export async function createEmployerJob(employerId, jobData) {
  const validatedJob = new Job({ ...jobData, employer: employerId });
  await validatedJob.validate();
  const validatedData = validatedJob.toObject();
  let session;
  let callbackCompleted = false;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(async () => {
      callbackCompleted = false;
      // Real write before any reads: competing creators conflict and retry with
      // a fresh snapshot. This is not a stored-job counter or a payment write.
      const owner = await Employer.updateOne({ _id: employerId, accountStatus: "active" },
        { $inc: { jobCreationVersion: 1 } }, { session, timestamps: false });
      if (owner.matchedCount !== 1) {
        throw accessError("Job posting is unavailable for this account.", 403, "JOB_POSTING_UNAVAILABLE");
      }
      // Eligibility is decided from this transaction's snapshot. Payment writers
      // do not share this lock: concurrent subscription changes are not atomic here.
      await checkEmployerJobAccess(employerId, { session });
      const job = new Job(validatedData);
      await job.save({ session, validateBeforeSave: false });
      callbackCompleted = true;
      return job;
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
  } catch (error) {
    // A lost commit reply must never cause deletion of a committed job's media.
    error.jobCommitOutcomeUnknown = Boolean(error.hasErrorLabel?.("UnknownTransactionCommitResult") ||
      callbackCompleted && session?.transaction?.state !== "TRANSACTION_ABORTED");
    if (!error.status && !["ValidationError", "CastError"].includes(error.name)) {
      error.status = 503;
      error.code = error.jobCommitOutcomeUnknown ? "JOB_POSTING_OUTCOME_UNKNOWN" : "JOB_POSTING_SERVICE_UNAVAILABLE";
    }
    throw error;
  } finally {
    await session?.endSession().catch(() => {});
  }
}
