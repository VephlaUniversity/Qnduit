import Job from "../models/Job.js";
import upload from "../utils/upload.js";


export const jobUpload = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "photos", maxCount: 10 }
]);


export const createJob = async (req, res, next) => {
  try {

    const employerId = req.user._id;

    let {
      jobTitle,
      jobDescription,
      category,
      jobCategory,
      jobApplyType,
      salaryType,
      minSalary,
      maxSalary,
      experience,
      careerLevel,
      qualification,
      deadlineDate,
      address,
      location,
      lat,
      lng
    } = req.body;

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
      deadlineDate,
      address,
      location,
      salary: {
        type: salaryType,
        min: Number(minSalary),
        max: Number(maxSalary)
      }
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
    next(error);
  }
};


export const updateJob = async (req, res, next) => {
  try {

    const { id } = req.params;
    const employerId = req.user._id;

    const job = await Job.findOne({
      _id: id,
      employer: employerId
    });

    if (!job)
      return res.status(404).json({ message: "Job not found" });

    Object.assign(job, req.body);

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
    next(error);
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

