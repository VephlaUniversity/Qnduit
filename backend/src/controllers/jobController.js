import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration.js";
import { jobApplicationMetadata } from "../utils/jobApplicationMetadata.js";
import Job from "../models/Job.js";
import { findPublicAdminJob } from "../services/publicAdminJob.js";
import { nonDeletedJobFilter } from "../services/jobVisibility.js";
import upload from "../utils/upload.js";
import { jobGallerySelection } from "../utils/jobGallery.js";
import {
  checkEmployerJobAccess,
  createEmployerJob,
} from "../services/employerJobAccess.js";
import { uploadJobMedia, removeNewJobMedia } from "../utils/jobMediaUpload.js";
import { jobDeadlineUpdate, lagosDateKey } from "../utils/jobDeadline.js";
import { sendJobInquiryEmail } from "../utils/sendEmail.js";
import { jobSalaryUpdate, jobSaveError } from "../utils/jobSalaryValidation.js";
import { rankJobs, buildSuggestions } from "../config/jobSearch.js";

export const jobUpload = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "photos", maxCount: 10 },
]);

export const createJob = async (req, res) => {
  const newAssets = [];
  let jobCommitted = false;
  try {
    const employerId = req.user._id;

    let {
      jobTitle,
      jobDescription,
      category,
      jobCategory,
      jobApplyType,
      experience,
      careerLevel,
      qualification,
      address,
      location,
      lat,
      lng,
    } = req.body;

    const gallery = jobGallerySelection(req.body);
    if (gallery.error)
      return res.status(400).json({ success: false, message: gallery.error });
    const deadline = jobDeadlineUpdate(req.body);
    if (deadline.error)
      return res.status(400).json({
        success: false,
        message: deadline.error,
        errors: { deadlineDate: deadline.error },
      });
    const { errors, salary } = jobSalaryUpdate(req.body);
    if (Object.keys(errors).length)
      return res.status(400).json({
        success: false,
        message: "Please check the salary fields.",
        errors,
      });

    const application = jobApplicationConfiguration(req.body);
    if (Object.keys(application.errors).length)
      return res.status(400).json({ success: false, message: "Please check the application details.", errors: application.errors });

    const job = new Job({
      ...application.configuration,
      employer: employerId,
      jobTitle,
      jobDescription,
      category,
      jobCategory,
      jobApplyType,
      experience,
      careerLevel,
      qualification,
      deadlineDate: deadline.value,
      address,
      location,
      salary,
    });

    if (lat && lng) {
      job.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }

    await job.validate();
    await checkEmployerJobAccess(employerId);
    Object.assign(
      job,
      await uploadJobMedia(req.files, {
        onUploaded: (asset) => newAssets.push(asset),
      }),
    );
    const savedJob = await createEmployerJob(employerId, job.toObject());
    jobCommitted = true;

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: savedJob,
    });
  } catch (error) {
    if (!jobCommitted && !error.jobCommitOutcomeUnknown)
      await removeNewJobMedia(newAssets);
    if (res.headersSent || res.destroyed) return;
    if (error.status === 403 || error.status === 503) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message:
          error.status === 403
            ? error.message
            : error.jobCommitOutcomeUnknown
              ? "The posting outcome could not be confirmed. Check My Jobs before trying again."
              : "Job posting is temporarily unavailable. Please try again later.",
      });
    }
    jobSaveError(res, error);
  }
};

// Scalar/object fields accepted by the existing form/update API. Salary, deadline
// and media use their existing validators/mappers below; ownership and deletion
// state are never taken from the request body.
const editableJobFields = [
  "jobTitle",
  "jobDescription",
  "category",
  "jobCategory",
  "jobApplyType",
  "workType",
  "experience",
  "careerLevel",
  "qualification",
  "address",
  "location",
  "geoLocation",
  "status",
];

export const updateJob = async (req, res) => {
  const newAssets = [];
  let writeAttempted = false;
  try {
    const { id } = req.params;
    const employerId = req.user._id;

    const job = await Job.findOne({
      _id: id,
      employer: employerId,
      ...nonDeletedJobFilter(),
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    const application = jobApplicationConfiguration(req.body, job);
    if (Object.keys(application.errors).length)
      return res.status(400).json({ success: false, message: "Please check the application details.", errors: application.errors });
    job.set(application.configuration);
    const gallery = jobGallerySelection(req.body, job.gallery);
    if (gallery.error)
      return res.status(400).json({ success: false, message: gallery.error });
    const deadline = jobDeadlineUpdate(req.body, job.deadlineDate);
    if (deadline.error)
      return res.status(400).json({
        success: false,
        message: deadline.error,
        errors: { deadlineDate: deadline.error },
      });
    const { errors, salary } = jobSalaryUpdate(req.body, job.salary);
    if (Object.keys(errors).length)
      return res.status(400).json({
        success: false,
        message: "Please check the salary fields.",
        errors,
      });
    for (const field of editableJobFields) {
      if (Object.hasOwn(req.body, field)) job.set(field, req.body[field]);
    }
    if (Object.hasOwn(deadline, "value")) job.deadlineDate = deadline.value;
    for (const [key, value] of Object.entries(salary))
      job.set(`salary.${key}`, value);

    await job.validate();
    // Do not mutate saved media until every replacement upload has succeeded.
    const media = await uploadJobMedia(req.files, {
      onUploaded: (asset) => newAssets.push(asset),
    });
    if (gallery.explicit || Object.hasOwn(media, "gallery")) {
      media.gallery = [...gallery.items, ...(media.gallery || [])];
    }
    Object.assign(job, media);

    await job.validate();
    writeAttempted = true;
    const savedJob = await Job.findOneAndUpdate(
      {
        _id: id,
        employer: employerId,
        ...nonDeletedJobFilter(),
      },
      job.getChanges(),
      { new: true, runValidators: true },
    );
    if (!savedJob) {
      await removeNewJobMedia(newAssets);
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({
      success: true,
      message: "Job updated successfully",
      job: savedJob,
    });
  } catch (error) {
    // A failed/partial upload or rejected update cannot own saved media. After
    // an ambiguous database write error, retain new assets: the write may have
    // committed even if its reply was lost. Never delete existing job assets.
    if (
      !writeAttempted ||
      ["ValidationError", "CastError"].includes(error.name)
    ) {
      await removeNewJobMedia(newAssets);
    }
    jobSaveError(res, error);
  }
};

export const getEmployerJobs = async (req, res, next) => {
  try {
    const employerId = req.user._id;

    const jobs = await Job.find({
      employer: employerId,
      ...nonDeletedJobFilter(),
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      ...nonDeletedJobFilter(),
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this job",
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;

    const job = await Job.findOneAndDelete({
      _id: id,
      employer: employerId,
      ...nonDeletedJobFilter(),
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const escapeRegex = (value) =>
  String(value)
    .trim()
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const queryText = (value) => (typeof value === "string" ? value : "");

// Published, not deleted, and not past its (Africa/Lagos) deadline.
const openJobFilter = () => ({
  status: "published",
  ...nonDeletedJobFilter(),
  $or: [
    { deadlineDate: null },
    { deadlineDate: { $exists: false } },
    { deadlineDate: { $gte: new Date(`${lagosDateKey()}T00:00:00.000Z`) } },
  ],
});

const searchPipeline = (
  { jobTitle, location, workType, q },
  extraStages = [],
) => {
  const matchStage = openJobFilter();
  if (jobTitle)
    matchStage.jobTitle = { $regex: escapeRegex(jobTitle), $options: "i" };
  if (location)
    matchStage.location = { $regex: escapeRegex(location), $options: "i" };
  if (workType) {
    // workType (Remote / On-site / Hybrid) is its own field, separate from jobApplyType (Full Time, ...)
    matchStage.workType = {
      $regex: `^${escapeRegex(workType).replace(/-/g, "[- ]")}$`,
      $options: "i",
    };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "employers",
        localField: "employer",
        foreignField: "_id",
        as: "employer",
      },
    },
    { $unwind: "$employer" },
    { $set: { source: "employer" } },
    { $unionWith: { coll: "adminjobs", pipeline: [
      { $match: matchStage },
      { $set: { source: "admin", employer: { companyName: { $ifNull: ["$organization", "QNDUIT"] } } } },
    ] } },
  ];

  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { jobTitle: rx },
          { location: rx },
          { category: rx },
          { jobCategory: rx },
          { "employer.companyName": rx },
        ],
      },
    });
  }

  pipeline.push(
    {
      $addFields: {
        planPriority: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$employer.selectedPlan", "platinum"] },
                then: 1,
              },
              { case: { $eq: ["$employer.selectedPlan", "silver"] }, then: 2 },
              { case: { $eq: ["$employer.selectedPlan", "bronze"] }, then: 3 },
            ],
            default: 4,
          },
        },
      },
    },
    { $sort: { planPriority: 1, createdAt: -1, _id: -1, source: 1 } },
    ...extraStages,
  );
  return pipeline;
};

// Most open jobs the smart search will look through per request.
const SEARCH_POOL = 1500;

const SEARCH_PROJECT = {
  _id: 1,
  source: 1,
  jobTitle: 1,
  jobDescription: 1,
  location: 1,
  address: 1,
  category: 1,
  jobCategory: 1,
  jobApplyType: 1,
  applicationType: { $ifNull: ["$applicationType", "internal"] },
  applicationUrl: 1,
  status: 1,
  isDeleted: 1,
  workType: 1,
  experience: 1,
  careerLevel: 1,
  qualification: 1,
  deadlineDate: 1,
  salary: 1,
  featuredImage: { url: "$featuredImage.url" },
  gallery: { $map: { input: { $ifNull: ["$gallery", []] }, as: "media", in: { url: "$$media.url", type: "$$media.type" } } },
  createdAt: 1,
  "employer._id": 1,
  "employer.companyName": 1,
  "employer.logo": 1,
  "employer.selectedPlan": 1,
  planPriority: 1,
};

export const searchJobs = async (req, res, next) => {
  try {
    const workType = queryText(req.query.workType);
    // "q" is what was typed; "jobTitle" is the older name for the same box.
    const q = queryText(req.query.q) || queryText(req.query.jobTitle);
    const location = queryText(req.query.location);

    // The database only narrows by work type; matching and ranking by the typed
    // words and place happen in rankJobs (spelling variants, typos, relevance).
    const pool = await Job.aggregate(
      searchPipeline({ workType }, [
        { $limit: SEARCH_POOL },
        { $project: SEARCH_PROJECT },
      ]),
    );

    const jobs = rankJobs(pool, { q, location }).map(job => ({ ...job, ...jobApplicationMetadata(job) }));

    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
};

// Suggestions while typing: GET /api/jobs/suggest?q=...
// Distinct job titles, companies and places that fit the typed words, with counts.
let suggestPool = { at: 0, jobs: [] };
const SUGGEST_TTL_MS = 30 * 1000;

export const suggestJobs = async (req, res, next) => {
  try {
    const q = queryText(req.query.q).trim().slice(0, 60);
    if (q.length < 2) {
      return res.json({
        success: true,
        titles: [],
        companies: [],
        locations: [],
      });
    }

    if (Date.now() - suggestPool.at > SUGGEST_TTL_MS) {
      const jobs = await Job.aggregate(
        searchPipeline({}, [
          { $limit: SEARCH_POOL },
          {
            $project: {
              jobTitle: 1,
              location: 1,
              workType: 1,
              "employer.companyName": 1,
            },
          },
        ]),
      );
      suggestPool = { at: Date.now(), jobs };
    }

    res.json({ success: true, ...buildSuggestions(suggestPool.jobs, q) });
  } catch (error) {
    next(error);
  }
};

// Lightweight suggestions for the dashboard search bar: GET /api/jobs?q=...
export const quickSearchJobs = async (req, res, next) => {
  try {
    const q = queryText(req.query.q).trim();
    if (!q) return res.json({ success: true, count: 0, jobs: [] });

    const jobs = await Job.aggregate(
      searchPipeline({ q }, [
        { $limit: 8 },
        {
          $project: {
            _id: 1,
            id: "$_id",
            source: 1,
            applicationType: { $ifNull: ["$applicationType", "internal"] },
            applicationUrl: 1, status: 1, isDeleted: 1, deadlineDate: 1,
            jobTitle: 1,
            location: 1,
            companyName: "$employer.companyName",
          },
        },
      ]),
    );

    res.json({ success: true, count: jobs.length, jobs: jobs.map(job => ({ ...job, ...jobApplicationMetadata(job) })) });
  } catch (error) {
    next(error);
  }
};

export const getPublicJobDetails = async (req, res, next) => {
  try {
    if (req.jobSource === "admin") {
      const job = await findPublicAdminJob(req.params.id);
      return job ? res.json({ success: true, job }) : res.status(404).json({ success: false, message: "Job not found" });
    }
    const job = await Job.findOne({
      _id: req.params.id,
      status: "published",
      ...nonDeletedJobFilter(),
    }).populate(
      "employer",
      "companyName logo selectedPlan companyWebsite companyEmail companyIndustry companySize location foundedYear socialNetworks",
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const jobData = {
      ...job.toObject(),
      ...jobApplicationMetadata(job),
      source: "employer",
      jobApplyType: job.jobApplyType
        ? Array.isArray(job.jobApplyType)
          ? job.jobApplyType
          : [job.jobApplyType]
        : [],
      requirements: job.requirements
        ? Array.isArray(job.requirements)
          ? job.requirements
          : [job.requirements]
        : [],
      qualifications: job.qualification
        ? Array.isArray(job.qualification)
          ? job.qualification
          : [job.qualification]
        : [],
    };

    res.json({
      success: true,
      job: jobData,
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedJobs = async (req, res, next) => {
  try {
    const source = req.jobSource || "employer";
    const job = source === "admin" ? await findPublicAdminJob(req.params.id) :
      await Job.findOne({ _id: req.params.id, ...nonDeletedJobFilter() }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    const pool = await Job.aggregate(searchPipeline({}, [{ $limit: SEARCH_POOL }, { $project: SEARCH_PROJECT }]));
    const keyword = String(job.jobTitle || "").split(" ")[0].toLowerCase();
    const jobs = pool.filter(candidate => !(candidate.source === source && String(candidate._id) === String(job._id)))
      .filter(candidate => candidate.location === job.location || candidate.jobApplyType === job.jobApplyType ||
        (keyword && String(candidate.jobTitle || "").toLowerCase().includes(keyword))).slice(0, 5);
    res.json({ success: true, jobs: jobs.map(job => ({ ...job, ...jobApplicationMetadata(job) })) });
  } catch (error) { next(error); }
};

// A signed-in user writes to whoever posted the job (route requires `protect`).
// The employer's address is never sent to the browser; the server emails it. The
// sender's name and email come from their account, not from the request body, so
// they cannot be spoofed.
export const contactJobPoster = async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const oneLine = (value, max) =>
      typeof value === "string"
        ? value
            .replace(/[\u0000-\u001f\u007f]+/g, " ")
            .trim()
            .slice(0, max)
        : "";
    const sender = req.user || {};
    const email = oneLine(sender.email, 254);
    const fullName =
      oneLine(sender.fullName || sender.companyName || sender.name, 100) ||
      email;
    const subject = oneLine(body.subject, 150);
    const message =
      typeof body.message === "string"
        ? body.message
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
            .trim()
            .slice(0, 5000)
        : "";

    let error = "";
    if (!email) error = "Your account has no email address to reply to.";
    else if (subject.length < 2) error = "Please enter a subject.";
    else if (message.length < 10)
      error = "Message must be at least 10 characters.";
    if (error) return res.status(400).json({ success: false, message: error });

    if (!/^[a-f0-9]{24}$/i.test(String(req.params.id))) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      status: "published",
      ...nonDeletedJobFilter(),
    }).populate("employer", "companyName companyEmail email");

    if (!job || !job.employer) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const recipient = job.employer.companyEmail || job.employer.email;
    if (!recipient) {
      console.error("Job contact: employer has no email", job._id.toString());
      return res.status(503).json({
        success: false,
        message: "This employer can't receive messages right now.",
      });
    }

    const origin = (process.env.FRONTEND_URL || "https://qnduit.com").replace(
      /\/+$/,
      "",
    );

    try {
      await sendJobInquiryEmail({
        to: recipient,
        companyName: job.employer.companyName,
        jobTitle: job.jobTitle,
        jobUrl: `${origin}/jobs/${job._id}`,
        fullName,
        email,
        subject,
        message,
      });
    } catch (sendError) {
      console.error(
        "Job contact send failed:",
        sendError.response?.body || sendError.message,
      );
      return res.status(500).json({
        success: false,
        message:
          "We couldn't send your message right now. Please try again later.",
      });
    }

    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    next(error);
  }
};
