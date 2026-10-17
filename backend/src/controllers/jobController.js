import Job from "../models/Job.js";
import upload from "../utils/upload.js";
import { jobDeadlineUpdate } from "../utils/jobDeadline.js";
import { jobSalaryUpdate, jobSaveError } from "../utils/jobSalaryValidation.js";


export const jobUpload = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "photos", maxCount: 10 }
]);


export const createJob = async (req, res) => {
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
      lng
    } = req.body;

    const deadline = jobDeadlineUpdate(req.body);
    if (deadline.error) return res.status(400).json({ success: false, message: deadline.error, errors: { deadlineDate: deadline.error } });
    const { errors, salary } = jobSalaryUpdate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: "Please check the salary fields.", errors });

    const job = new Job({
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
      salary
    });

    if (lat && lng) {
      job.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
    }

    if (req.files?.featuredImage) {
      const file = req.files.featuredImage[0];
      job.featuredImage = {
        url: `/uploads/${file.filename}`,
        public_id: file.filename
      };
    }

    if (req.files?.photos) {
      job.gallery = req.files.photos.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith("video") ? "video" : "image",
        public_id: file.filename
      }));
    }

    await job.save();

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job
    });

  } catch (error) {
    jobSaveError(res, error);
  }
};


export const updateJob = async (req, res) => {
  try {

    const { id } = req.params;
    const employerId = req.user._id;

    const job = await Job.findOne({
      _id: id,
      employer: employerId
    });

    if (!job)
      return res.status(404).json({ message: "Job not found" });

    const deadline = jobDeadlineUpdate(req.body, job.deadlineDate);
    if (deadline.error) return res.status(400).json({ success: false, message: deadline.error, errors: { deadlineDate: deadline.error } });
    const { errors, salary } = jobSalaryUpdate(req.body, job.salary);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: "Please check the salary fields.", errors });
    // Salary needs deliberate mapping; flat form fields are not model paths.
    const updates = Object.fromEntries(Object.entries(req.body)
      .filter(([key]) => !["salary", "salaryType", "minSalary", "maxSalary", "deadlineDate"].includes(key) && !key.startsWith("salary.")));
    Object.assign(job, updates);
    if (Object.hasOwn(deadline, "value")) job.deadlineDate = deadline.value;
    for (const [key, value] of Object.entries(salary)) job.set(`salary.${key}`, value);

    if (req.files?.featuredImage) {
      const file = req.files.featuredImage[0];
      job.featuredImage = {
        url: `/uploads/${file.filename}`,
        public_id: file.filename
      };
    }

    if (req.files?.photos) {
      job.gallery = req.files.photos.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith("video") ? "video" : "image",
        public_id: file.filename
      }));
    }

    await job.save();

    res.json({
      success: true,
      message: "Job updated successfully",
      job
    });

  } catch (error) {
    jobSaveError(res, error);
  }
};

export const getEmployerJobs = async (req, res, next) => {
  try {

    const employerId = req.user._id;

    const jobs = await Job.find({ employer: employerId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs
    });

  } catch (error) {
    next(error);
  }
};

export const getSingleJob = async (req, res, next) => {
  try {

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this job"
      });
    }


    res.json({
      success: true,
      job
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
      employer: employerId
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    res.json({
      success: true,
      message: "Job deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};

export const searchJobs = async (req, res, next) => {
  try {
    const { jobTitle, location, workType } = req.query;

    let matchStage = {
      status: "published",
      isDeleted: false
    };

    if (jobTitle) {
      matchStage.jobTitle = {
        $regex: jobTitle,
        $options: "i"
      };
    }

    if (location) {
      matchStage.location = {
        $regex: location,
        $options: "i"
      };
    }

    if (workType) {
      const normalizedWorkType = workType.replace("-", " ");

      matchStage.jobApplyType = {
        $regex: normalizedWorkType,
        $options: "i"
      };
    }

    const jobs = await Job.aggregate([
      {
        $match: matchStage
      },

      // JOIN employer collection
      {
        $lookup: {
          from: "employers",
          localField: "employer",
          foreignField: "_id",
          as: "employer"
        }
      },

      {
        $unwind: "$employer"
      },

      // PLAN PRIORITY 
      {
        $addFields: {
          planPriority: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$employer.selectedPlan", "platinum"] },
                  then: 1
                },
                {
                  case: { $eq: ["$employer.selectedPlan", "silver"] },
                  then: 2
                },
                {
                  case: { $eq: ["$employer.selectedPlan", "bronze"] },
                  then: 3
                }
              ],
              default: 4
            }
          }
        }
      },

      // SORT 
      {
        $sort: {
          planPriority: 1,
          createdAt: -1
        }
      },

      {
        $project: {
          _id: 1,
          jobTitle: 1,
          jobDescription: 1,
          location: 1,
          jobCategory: 1,
          jobApplyType: 1,
          experience: 1,
          careerLevel: 1,
          qualification: 1,
          deadlineDate: 1,
          salary: 1,
          featuredImage: 1,
          gallery: 1,
          createdAt: 1,
          "employer.companyName": 1,
          "employer.selectedPlan": 1,
          planPriority: 1
        }
      }
    ]);

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (error) {
    next(error);
  }
};

export const getPublicJobDetails = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      status: "published",
      isDeleted: false,
    }).populate("employer", "companyName selectedPlan companyWebsite companyEmail companyIndustry companySize location foundedYear socialNetworks");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const jobData = {
      ...job.toObject(),
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

export const getRelatedJobs = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const keyword = job.jobTitle?.split(" ")[0] || "";

    const relatedJobs = await Job.find({
      _id: { $ne: job._id }, // exclude current job
      status: "published",
      isDeleted: false,
      $or: [
        { location: job.location },
        { jobApplyType: job.jobApplyType },
        ...(keyword
          ? [{ jobTitle: { $regex: keyword, $options: "i" } }]
          : []),
      ],
    })
      .limit(5)
      .populate("employer", "companyName");

    const normalizedJobs = relatedJobs.map((j) => ({
      ...j.toObject(),
      jobApplyType: j.jobApplyType
        ? Array.isArray(j.jobApplyType)
          ? j.jobApplyType
          : [j.jobApplyType]
        : [],
    }));

    res.json({
      success: true,
      jobs: normalizedJobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};