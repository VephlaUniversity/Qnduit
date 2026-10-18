import JobApplication from "../models/JobApplication.js";
import Job from "../models/Job.js";


// Apply for job
export const applyForJob = async (req, res, next) => {
  try {
    const applicantId = req.user._id;
    const { jobId } = req.body;

    const job = await Job.findById(jobId);

    if (!job || job.isDeleted || job.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Job not found or no longer available",
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

    const application = await JobApplication.create({
      jobId,
      applicantId,
      employerId: job.employer,
    });

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
      .populate("applicantId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch {
    res.status(500).json({ success: false, message: "Unable to load applications. Please try again." });
  }
};
// Employer Applications
export const getEmployerApplications = async (req, res, next) => {
  try {
    const employerId = req.user._id;

    const [applications, totalApplications, seenApplications] = await Promise.all([
      JobApplication.find({ employerId, employerArchivedAt: null })
      .populate({
        path: "applicantId",
        select: `
          firstName lastName email phone location jobTitle experienceTime avatar resume
        `
      })
      .populate("jobId", "jobTitle")
      .sort({ createdAt: -1 }),
      JobApplication.countDocuments({ employerId }),
      // Preserve the dashboard's existing legacy "Seen" calculation, not "reviewed".
      JobApplication.countDocuments({ employerId, status: "Seen" }),
    ]);

    const formatted = applications.map(app => ({
      id: app._id,
      status: app.status || "Pending",
      date: app.createdAt, // Preserve the legacy field for existing consumers.
      appliedAt: app.appliedAt ?? app.createdAt,
      createdAt: app.createdAt,
      resumeUrl: app.resumeUrl?.trim() || app.applicantId?.resume?.url || "",
      resumeSource: app.resumeUrl?.trim() ? "application" : app.applicantId?.resume?.url ? "talent" : null,

      applicant: {
        id: app.applicantId?._id,
        name: `${app.applicantId?.firstName || ""} ${app.applicantId?.lastName || ""}`,
        email: app.applicantId?.email,
        phone: app.applicantId?.phone,
        location: app.applicantId?.location,
        jobTitle: app.applicantId?.jobTitle,
        experience: app.applicantId?.experienceTime,
        avatar: app.applicantId?.avatar?.url,
        resume: app.applicantId?.resume?.url,
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
      seenApplications,
    });

  } catch (error) {
    next(error);
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
    const saved = await JobApplication.findOneAndUpdate({ ...filter, status: expectedStatus, employerArchivedAt: null }, { $set: { status } }, { new: true, runValidators: true });
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
