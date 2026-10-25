import JobApplication from "../models/JobApplication.js";
import Job from "../models/Job.js";
import Talent from "../models/Talent.js";
import Resume from "../models/Resume.js";
import { jobDateKey, lagosDateKey } from "../utils/jobDeadline.js";
import { applicationEvent } from "../services/notifications.js";


// Apply for job
export const applyForJob = async (req, res, next) => {
  try {
    const applicantId = req.user._id;
    const { jobId } = req.body;

    if (typeof jobId !== "string" || !/^[a-f\d]{24}$/i.test(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);

    if (!job || job.isDeleted || job.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Job not found or no longer available",
      });
    }

    if (job.deadlineDate && jobDateKey(job.deadlineDate) < lagosDateKey()) {
      return res.status(400).json({
        success: false,
        message: "The application deadline for this job has passed",
      });
    }

    const existingApplication = await JobApplication.findOne({
      jobId,
      applicantId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You already applied for this job",
      });
    }

    const intent = req.user.role === "talent" ? applicationEvent("application", { employerId: job.employer }) : null;
    let application;
    try {
      application = await JobApplication.create({
        jobId,
        applicantId,
        employerId: job.employer,
        ...(intent ? { notificationOutbox: [intent], notificationNextAttemptAt: intent.occurredAt } : {}),
      });
    } catch (error) {
      // Double-click / concurrent request: the unique (jobId, applicantId) index won the race.
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "You already applied for this job" });
      }
      throw error;
    }

    await Job.findByIdAndUpdate(jobId, {
      $inc: { applicantsCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    next(error);
  }
};



// get applications for logged in user
export const getMyApplications = async (req, res, next) => {
  try {

    const applicantId = req.user._id;

    const applications = await JobApplication.find({
      applicantId,
    })
      .populate("jobId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications,
    });

  } catch (error) {
    next(error);
  }
};



// employer view applications for job
export const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID." });
    }
    const job = await Job.findById(jobId).select("employer").lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (String(job.employer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to view these applications." });
    }
    const applications = await JobApplication.find({ jobId, employerId: req.user._id, employerArchivedAt: null })
      .populate("applicantId", "name fullName firstName lastName avatar email")
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch {
    res.status(500).json({ success: false, message: "Unable to load applications. Please try again." });
  }
};
// Employer Applications
export const getEmployerApplications = async (req, res) => {
  try {
    const employerId = req.user._id;

    const { q = "", status = "all", page, limit = "20", summaryOnly } = req.query;
    const paginated = page !== undefined;
    if (typeof q !== "string" || q.length > 200 || typeof status !== "string"
      || !["all", "pending", "reviewed", "shortlisted", "rejected", "hired"].includes(status)
      || (paginated && (typeof page !== "string" || typeof limit !== "string" || !/^[1-9]\d{0,5}$/.test(page) || !/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100))) {
      return res.status(400).json({ message: "Invalid application search parameters." });
    }
    const owner = { employerId };
    const active = { ...owner, employerArchivedAt: null, ...(status === "all" ? {} : { status }) };
    let matchingTotal;
    const currentPage = paginated ? Number(page) : 1;
    const pageSize = Number(limit);
    let rowFilter = active;
    if (summaryOnly !== "true" && (paginated || q.trim())) {
      const pipeline = [{ $match: active }];
      if (q.trim()) {
        const regex = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        pipeline.push(
          { $lookup: { from: Talent.collection.name, localField: "applicantId", foreignField: "_id",
            pipeline: [{ $project: { fullName: 1, firstName: 1, lastName: 1, location: 1 } }], as: "talent" } },
          { $lookup: { from: Job.collection.name, localField: "jobId", foreignField: "_id",
            pipeline: [{ $project: { jobTitle: 1 } }], as: "job" } },
          { $match: { $or: [
            { "talent.fullName": { $regex: regex, $options: "i" } },
            { "talent.location": { $regex: regex, $options: "i" } },
            { "job.jobTitle": { $regex: regex, $options: "i" } },
            { $expr: { $regexMatch: { input: { $concat: [
              { $ifNull: [{ $arrayElemAt: ["$talent.firstName", 0] }, ""] }, " ",
              { $ifNull: [{ $arrayElemAt: ["$talent.lastName", 0] }, ""] },
            ] }, regex, options: "i" } } },
          ] } },
        );
      }
      // One aggregation snapshot supplies both matching totals and the bounded page.
      const [result] = await JobApplication.aggregate([...pipeline, { $facet: {
        count: [{ $count: "total" }],
        rows: [{ $sort: { createdAt: -1, _id: -1 } },
          ...(paginated ? [{ $skip: (currentPage - 1) * pageSize }, { $limit: pageSize }] : []), { $project: { _id: 1 } }],
      } }]);
      matchingTotal = result.count[0]?.total || 0;
      const ids = result.rows;
      rowFilter = { ...active, _id: { $in: ids.map(item => item._id) } };
    }
    const [applications, totalApplications, reviewedApplications] = await Promise.all([
      summaryOnly === "true" ? [] : JobApplication.find(rowFilter)
        .populate({ path: "applicantId", select: "fullName firstName lastName email phone location jobTitle experienceTime avatar resume" })
        .populate("jobId", "jobTitle").sort({ createdAt: -1, _id: -1 }),
      JobApplication.countDocuments(owner),
      // Current reviewed status across all owner records, including archived applications.
      JobApplication.countDocuments({ ...owner, status: "reviewed" }),
    ]);

    // Resumes uploaded on the talent Resume page live in the Resume collection (cvFiles),
    // not on the Talent record, so look them up and use the newest one as a fallback.
    const applicantIds = [...new Set(applications.map(app => String(app.applicantId?._id || "")).filter(Boolean))];
    const resumeDocs = applicantIds.length
      ? await Resume.find({ talent: { $in: applicantIds } }).select("talent cvFiles").lean()
      : [];
    const cvByTalent = new Map(resumeDocs.map(doc => [String(doc.talent), [...(doc.cvFiles || [])].reverse().find(file => file?.url)?.url || ""]));
    const talentResumeUrl = app => cvByTalent.get(String(app.applicantId?._id)) || app.applicantId?.resume?.url || "";

    const formatted = applications.map(app => ({
      id: app._id,
      status: app.status || "Pending",
      date: app.createdAt, // Preserve the legacy field for existing consumers.
      appliedAt: app.appliedAt ?? app.createdAt,
      createdAt: app.createdAt,
      resumeUrl: app.resumeUrl?.trim() || talentResumeUrl(app),
      resumeSource: app.resumeUrl?.trim() ? "application" : talentResumeUrl(app) ? "talent" : null,

      applicant: {
        id: app.applicantId?._id,
        name: app.applicantId?.fullName?.trim() ||
          [app.applicantId?.firstName, app.applicantId?.lastName].filter(value => typeof value === "string" && value.trim()).map(value => value.trim()).join(" ") || "Unknown",
        email: app.applicantId?.email,
        phone: app.applicantId?.phone,
        location: app.applicantId?.location,
        jobTitle: app.applicantId?.jobTitle,
        experience: app.applicantId?.experienceTime,
        avatar: typeof app.applicantId?.avatar === "string" ? app.applicantId.avatar : app.applicantId?.avatar?.url,
        resume: talentResumeUrl(app) || undefined,
      },

      job: {
        id: app.jobId?._id,
        title: app.jobId?.jobTitle,
      }
    }));

    res.status(200).json({
      success: true,
      applications: formatted,
      totalApplications,
      reviewedApplications,
      seenApplications: reviewedApplications, // Deprecated compatibility alias; no obsolete Seen status query.
      ...(paginated && summaryOnly !== "true" ? { pagination: { page: currentPage, limit: pageSize, total: matchingTotal, pages: Math.max(1, Math.ceil(matchingTotal / pageSize)) } } : {}),
    });

  } catch {
    return res.status(500).json({ message: "Unable to load applications. Please try again." });
  }
};
const applicationStatuses = ["pending", "reviewed", "shortlisted", "hired", "rejected"];
const statusTransitions = {
  pending: ["reviewed", "rejected"], reviewed: ["shortlisted", "rejected"],
  shortlisted: ["hired", "rejected"], hired: [], rejected: [],
};
const savedStatus = application => ({
  applicationId: String(application._id), talentId: String(application.applicantId),
  jobId: String(application.jobId), status: application.status, updatedAt: application.updatedAt,
});
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, expectedStatus } = req.body || {};
    if (!/^[a-f\d]{24}$/i.test(applicationId) || !applicationStatuses.includes(status) || !applicationStatuses.includes(expectedStatus)) {
      return res.status(400).json({ message: "A valid application ID, status and expectedStatus are required." });
    }
    const filter = { _id: applicationId, employerId: req.user._id };
    const current = await JobApplication.findOne(filter);
    if (!current) return res.status(404).json({ message: "Application not found." });
    if (current.employerArchivedAt) return res.status(409).json({ message: "Application is archived. Refresh your list." });
    if (current.status === status) return res.json({ success: true, application: savedStatus(current) });
    if (current.status !== expectedStatus) return res.status(409).json({ message: "This application changed. Refresh before trying again.", application: savedStatus(current) });
    if (!statusTransitions[current.status]?.includes(status)) return res.status(400).json({ message: "This status transition is not allowed.", application: savedStatus(current) });
    const intent = applicationEvent("application-status", current, status);
    const saved = await JobApplication.findOneAndUpdate({ ...filter, status: expectedStatus, employerArchivedAt: null }, {
      $set: { status, ...(intent ? { notificationNextAttemptAt: intent.occurredAt } : {}) },
      ...(intent ? { $push: { notificationOutbox: intent } } : {}),
    }, { new: true, runValidators: true });
    if (saved) return res.json({ success: true, application: savedStatus(saved) });
    const latest = await JobApplication.findOne(filter);
    if (!latest) return res.status(404).json({ message: "Application not found." });
    if (latest.employerArchivedAt) return res.status(409).json({ message: "Application is archived. Refresh your list." });
    if (latest.status === status) return res.json({ success: true, application: savedStatus(latest) });
    return res.status(409).json({ message: "This application changed. Refresh before trying again.", application: savedStatus(latest) });
  } catch {
    return res.status(500).json({ message: "Unable to update application status. Please try again." });
  }
};

export const archiveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(applicationId)) return res.status(400).json({ message: "Invalid application ID." });
    const owner = { _id: applicationId, employerId: req.user._id };
    // Missing metadata is legacy active data. Set the first archive timestamp once.
    const saved = await JobApplication.findOneAndUpdate({ ...owner, employerArchivedAt: null },
      { $set: { employerArchivedAt: new Date(), employerArchivedBy: req.user._id } },
      { new: true, runValidators: true, timestamps: false });
    const application = saved || await JobApplication.findOne(owner);
    if (!application) return res.status(404).json({ message: "Application not found." });
    res.json({ success: true, application: { applicationId: String(application._id), status: application.status, employerArchivedAt: application.employerArchivedAt } });
  } catch {
    res.status(500).json({ message: "Unable to archive application. Please try again." });
  }
};
