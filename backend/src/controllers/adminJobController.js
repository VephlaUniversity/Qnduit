import { createHash } from "node:crypto";
import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration.js";
import AdminJob from "../models/AdminJob.js";
import { uploadJobMedia, removeNewJobMedia } from "../utils/jobMediaUpload.js";
import { jobGallerySelection } from "../utils/jobGallery.js";
import { jobDeadlineUpdate, jobDateKey, lagosDateKey } from "../utils/jobDeadline.js";
import { jobSalaryUpdate } from "../utils/jobSalaryValidation.js";

const fail = (status, message, errors) => Object.assign(new Error(message), { status, errors });
const textFields = ["jobTitle", "jobDescription", "organization", "category", "experience", "careerLevel", "qualification", "address", "location"];
const editable = [...textFields, "applicationType", "applicationUrl", "jobCategory", "jobApplyType", "workType", "salary", "minSalary", "maxSalary", "salaryType", "deadlineDate", "retainedGalleryIds", "removeFeaturedImage"];
const hash = value => createHash("sha256").update(value).digest("hex");
const poster = { path: "postedBy", select: "name", transform: (doc, id) => doc || { _id: id } };
const dto = job => ({
  source: "admin", jobId: String(job._id), postedBy: String(job.postedBy?._id || job.postedBy), postedByName: job.postedBy?.name || "Admin account unavailable",
  featuredImage: job.featuredImage?.url ? { url: job.featuredImage.url } : null,
  gallery: (job.gallery || []).map(item => ({ _id: String(item._id), url: item.url, type: item.type })),
  ...Object.fromEntries([...textFields, "jobCategory", "jobApplyType", "workType", "salary", "deadlineDate", "status", "flagged", "revision", "createdAt", "updatedAt"].map(key => [key, job[key]])),
  applicationType: job.applicationType ?? "internal", applicationUrl: job.applicationType === "external" ? job.applicationUrl || "" : "",
  effectiveStatus: job.status === "published" && jobDateKey(job.deadlineDate) && jobDateKey(job.deadlineDate) < lagosDateKey() ? "expired" : job.status,
});
function bodyFor(req, allowed) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || body.source !== "admin" || Object.keys(body).some(key => !["source", ...allowed].includes(key))) {
    throw fail(400, "Use an Admin job request with only the supported fields. Identity and ownership are assigned by the server.");
  }
  return body;
}
function fields(body, existing, creating = false) {
  const application = jobApplicationConfiguration(body, existing || {});
  const data = { ...application.configuration }, errors = { ...application.errors };
  for (const field of textFields) {
    if (!Object.hasOwn(body, field) && !creating) continue;
    const value = body[field] ?? "";
    if (typeof value !== "string") errors[field] = "Enter valid text.";
    else data[field] = value.trim();
  }
  if (Object.hasOwn(data, "jobTitle") && !data.jobTitle.length) errors.jobTitle = "Job Title is required.";
  if (Object.hasOwn(data, "jobDescription") && data.jobDescription.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim().length < 1) errors.jobDescription = "Job Description is required.";
  for (const [key, choices, fallback] of [["jobCategory", ["Full Time", "Part Time", "Contract", "Freelance", "Internship"], undefined], ["jobApplyType", ["Full Time", "Part Time", "Contract", "Freelance", "Internship"], undefined], ["workType", ["Remote", "On-site", "Hybrid"], "On-site"]]) {
    if (!Object.hasOwn(body, key) && !creating) continue;
    if (body[key] === "" && key !== "workType") { errors[key] = "Choose a supported option."; continue; }
    const value = body[key] || fallback;
    if (value !== undefined && !choices.includes(value)) errors[key] = "Choose a supported option.";
    else data[key] = value ?? null;
  }
  if (body.salary && Object.keys(body.salary).some(key => !["min", "max", "type"].includes(key))) errors.salary = "Use only salary min, max and type.";
  const salary = jobSalaryUpdate(body, existing?.salary);
  Object.assign(errors, salary.errors);
  if (Object.keys(salary.salary).length) {
    data.salary = { ...(existing?.salary || {}), ...salary.salary };
    if (data.salary.type !== undefined && !["Hour", "Day", "Week", "Month", "Year", "Project"].includes(data.salary.type)) errors.salaryType = "Choose a supported salary period.";
  }
  const deadline = jobDeadlineUpdate(body, existing?.deadlineDate);
  if (deadline.error) errors.deadlineDate = deadline.error;
  else if (Object.hasOwn(deadline, "value")) data.deadlineDate = deadline.value;
  if (Object.keys(errors).length) throw fail(400, "Please check the job details.", errors);
  return data;
}
function revision(body) {
  if (typeof body.revision === "string" && /^(0|[1-9]\d*)$/.test(body.revision)) body.revision = Number(body.revision);
  if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw fail(400, "A saved Admin job revision is required. Refresh the job details.");
  return body.revision;
}
const statusValue = value => {
  if (!["draft", "published", "closed"].includes(value)) throw fail(400, "Choose draft, published or closed.");
  return value;
};
const respond = work => async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  try { await work(req, res); }
  catch (error) {
    const validation = ["ValidationError", "CastError", "StrictModeError"].includes(error.name);
    res.status(error.status || (validation ? 400 : 503)).json({ success: false,
      message: error.status ? error.message : validation ? "Please check the job details." : "The job operation could not be confirmed. Refresh Admin Jobs before retrying.",
      ...(error.errors && error.status ? { errors: error.errors } : {}),
    });
  }
};
export const validateAdminJobTarget = (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (req.params.source !== "admin" || !/^[a-f\d]{24}$/i.test(req.params.id || "")) return res.status(400).json({ success: false, message: "A typed Admin job ID is required." });
  next();
};
const withPoster = job => job.populate(poster);
function mediaSelection(body, existing) {
  const gallery = jobGallerySelection(body, existing?.gallery);
  if (gallery.error) throw fail(400, gallery.error);
  if (Object.hasOwn(body, "removeFeaturedImage") && ![true, false, "true", "false"].includes(body.removeFeaturedImage)) throw fail(400, "Choose whether to remove the featured image.");
  return gallery;
}
export const createAdminJob = respond(async (req, res) => {
  const body = bodyFor(req, [...editable, "requestId", "status"]);
  if (typeof body.requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(body.requestId)) throw fail(400, "A valid job request ID is required.");
  const data = { ...fields(body, null, true), status: statusValue(body.status ?? "draft") };
  mediaSelection(body);
  const id = hash(`${req.user._id}:${body.requestId.toLowerCase()}`).slice(0, 24);
  const files = Object.entries(req.files || {}).sort(([a], [b]) => a.localeCompare(b)).map(([field, rows]) => [field, rows.map(file => ({ name: file.originalname, type: file.mimetype, hash: createHash("sha256").update(file.buffer).digest("hex") }))]);
  const fingerprint = hash(JSON.stringify({ data, files }));
  const replay = async () => {
    const existing = await AdminJob.findById(id).select("+creationFingerprint").populate(poster);
    if (!existing || existing.isDeleted || String(existing.postedBy?._id) !== String(req.user._id) || existing.creationFingerprint !== fingerprint) throw fail(409, "This request ID belongs to a different or deleted job. Refresh Admin Jobs before posting again.");
    res.json({ success: true, job: dto(existing), replayed: true });
  };
  if (await AdminJob.exists({ _id: id })) return replay();
  const job = new AdminJob({ _id: id, ...data, postedBy: req.user._id, creationFingerprint: fingerprint });
  await job.validate();
  const assets = []; let writeAttempted = false;
  try {
    Object.assign(job, await uploadJobMedia(req.files, { folderPrefix: "qnduit/admin", onUploaded: asset => assets.push(asset) }));
    await job.validate(); writeAttempted = true;
    await job.save();
  } catch (error) {
    if (!writeAttempted || error.code === 11000 || ["ValidationError", "CastError"].includes(error.name)) await removeNewJobMedia(assets);
    if (error.code === 11000) return replay();
    throw error;
  }
  // Do not clean up after a possibly committed write/population error.
  res.status(201).json({ success: true, job: dto(await withPoster(job)), replayed: false });
});
export const listAdminJobs = respond(async (req, res) => {
  if (req.query.source !== "admin" || Object.keys(req.query).some(key => !["source", "search", "sort", "page", "limit", "status"].includes(key))) throw fail(400, "Use the Admin job listing filters.");
  const page = Number(req.query.page ?? 1), limit = Number(req.query.limit ?? 10);
  const search = req.query.search ?? "", sort = req.query.sort ?? "newest", status = req.query.status ?? "all";
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || typeof search !== "string" || search.length > 120) throw fail(400, "Invalid job search or pagination.");
  const sorts = { newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 }, "title-asc": { jobTitle: 1, _id: 1 } };
  if (!Object.hasOwn(sorts, sort) || !["all", "draft", "published", "closed"].includes(status)) throw fail(400, "Invalid job sort or status filter.");
  const filter = { isDeleted: false, ...(status !== "all" ? { status } : {}) };
  if (search.trim()) {
    const expression = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = ["jobTitle", "location", "organization"].map(key => ({ [key]: expression }));
  }
  const jobs = await AdminJob.find(filter).sort(sorts[sort]).skip((page - 1) * limit).limit(limit).populate(poster).lean();
  const total = await AdminJob.countDocuments(filter);
  res.json({ success: true, source: "admin", data: jobs.map(dto), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});
export const getAdminPostedJob = respond(async (req, res) => {
  const job = await AdminJob.findOne({ _id: req.params.id, isDeleted: false }).populate(poster).lean();
  if (!job) throw fail(404, "Admin job not found.");
  res.json({ success: true, job: dto(job) });
});
const change = async (req, res, body, update) => {
  const saved = await AdminJob.findOneAndUpdate({ _id: req.params.id, isDeleted: false, revision: revision(body) },
    { $set: update, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!saved) {
    if (!await AdminJob.exists({ _id: req.params.id, isDeleted: false })) throw fail(404, "Admin job not found.");
    throw fail(409, "This job changed. Refresh its details before trying again.");
  }
  res.json({ success: true, ...(update.isDeleted ? { source: "admin", jobId: String(saved._id) } : { job: dto(await withPoster(saved)) }) });
};
export const updateAdminJob = respond(async (req, res) => {
  const body = bodyFor(req, [...editable, "revision"]);
  if (!editable.some(key => Object.hasOwn(body, key)) && !Object.keys(req.files || {}).length) throw fail(400, "Provide job details to update.");
  const version = revision(body);
  const job = await AdminJob.findOne({ _id: req.params.id, isDeleted: false }).select("+creationFingerprint").lean();
  if (!job) throw fail(404, "Admin job not found.");
  if (job.revision !== version) throw fail(409, "This job changed. Refresh its details before trying again.");
  const data = fields(body, job), gallery = mediaSelection(body, job);
  const candidate = new AdminJob({ ...job, ...data }); await candidate.validate();
  const assets = []; let writeAttempted = false;
  try {
    const media = await uploadJobMedia(req.files, { folderPrefix: "qnduit/admin", onUploaded: asset => assets.push(asset) });
    if (gallery.explicit || media.gallery) data.gallery = [...gallery.items, ...(media.gallery || [])];
    if (media.featuredImage) data.featuredImage = media.featuredImage;
    else if ([true, "true"].includes(body.removeFeaturedImage)) data.featuredImage = {};
    const validated = new AdminJob({ ...job, ...data }); await validated.validate();
    writeAttempted = true;
    const saved = await AdminJob.findOneAndUpdate({ _id: job._id, isDeleted: false, revision: version }, { $set: data, $inc: { revision: 1 } }, { new: true, runValidators: true });
    if (!saved) { await removeNewJobMedia(assets); throw fail(409, "This job changed. Refresh its details before trying again."); }
    res.json({ success: true, job: dto(await withPoster(saved)) });
  } catch (error) {
    if (!writeAttempted || ["ValidationError", "CastError"].includes(error.name)) await removeNewJobMedia(assets);
    throw error;
  }
});
export const setAdminJobStatus = respond(async (req, res) => {
  const body = bodyFor(req, ["revision", "status"]);
  await change(req, res, body, { status: statusValue(body.status) });
});
export const setAdminJobFlag = respond(async (req, res) => {
  const body = bodyFor(req, ["revision", "flagged"]);
  if (typeof body.flagged !== "boolean") throw fail(400, "Provide a flag choice.");
  await change(req, res, body, { flagged: body.flagged });
});
export const deleteAdminPostedJob = respond(async (req, res) => {
  const body = bodyFor(req, ["revision"]);
  await change(req, res, body, { isDeleted: true, deletedAt: new Date() });
});
