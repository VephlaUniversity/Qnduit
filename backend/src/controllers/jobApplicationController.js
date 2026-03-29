import JobApplication from "../models/JobApplication.js";
import Job from "../models/Job.js";


// Apply for job
export const applyForJob = async (req, res, next) => {
  try {

    const applicantId = req.user._id;
    const { jobId } = req.body;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // prevent duplicate application
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
export const getJobApplications = async (req, res, next) => {
  try {

    const { jobId } = req.params;

    const applications = await JobApplication.find({
      jobId,
    })
      .populate("applicantId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications,
    });

  } catch (error) {
    next(error);
  }
};

export const getEmployerApplications = async (req, res, next) => {
  try {
    const employerId = req.user._id;

    const applications = await JobApplication.find({ employerId })
      .populate({
        path: "applicantId",
        select: `
          firstName lastName email phone location jobTitle experienceTime avatar resume
        `
      })
      .populate("jobId", "jobTitle")
      .sort({ createdAt: -1 });

    const formatted = applications.map(app => ({
      id: app._id,
      status: app.status || "Pending",
      date: app.createdAt,

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
    });

  } catch (error) {
    next(error);
  }
};