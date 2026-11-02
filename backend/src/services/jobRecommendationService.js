
import Job from "../models/Job.js";
import AdminJob from "../models/AdminJob.js";
import Talent from "../models/Talent.js";
import { lagosDateKey } from "../utils/jobDeadline.js";
import { jobApplicationMetadata } from "../utils/jobApplicationMetadata.js";

const ADMIN_PRIORITY_BOOST = 12;

const PLAN_BOOSTS = {
  platinum: 9,
  silver: 6,
  bronze: 3,
};

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value) =>
  normalize(value).split(" ").filter((word) => word.length > 1);

const asText = (value) =>
  Array.isArray(value) ? value.join(" ") : String(value || "");

const deadlineStart = () =>
  new Date(`${lagosDateKey()}T00:00:00.000Z`);

function isActivePaidSubscription(employer) {
  if (!employer || employer.paymentStatus !== "active") return false;

  const expiry = employer.planExpiresAt;
  if (!expiry || new Date(expiry).getTime() <= Date.now()) return false;

  return Object.hasOwn(PLAN_BOOSTS, normalize(employer.selectedPlan));
}

function normalizeEmployerJob(job) {
  const item = job.toObject ? job.toObject() : job;
  const employer = item.employer || {};

  return {
    ...item,
    source: "employer",
    companyName: employer.companyName || "Employer",
    companyLogo: employer.logo?.url || "",
    employer: {
      _id: employer._id,
      companyName: employer.companyName,
      logo: employer.logo,
    },
    subscriptionBoost: isActivePaidSubscription(employer)
      ? PLAN_BOOSTS[normalize(employer.selectedPlan)]
      : 0,
  };
}

function normalizeAdminJob(job) {
  const item = job.toObject ? job.toObject() : job;

  return {
    ...item,
    source: "admin",
    companyName: item.organization || "QNDUIT",
    companyLogo: item.featuredImage?.url || "",
    employer: {
      companyName: item.organization || "QNDUIT",
    },
    subscriptionBoost: 0,
  };
}

function candidateProfileTerms(talent) {
  return {
    skills: words(asText(talent.tags)),
    categories: words(asText(talent.categories)),
    title: words(talent.jobTitle),
    location: normalize(talent.location),
    experience: normalize(talent.experienceTime),
  };
}

function scoreJob(job, profile) {
  let score = 0;

  const title = words(job.jobTitle);
  const category = words(
    `${job.category || ""} ${job.jobCategory || ""}`,
  );
  const description = words(job.jobDescription);
  const jobLocation = normalize(job.location || job.address);

  const jobTerms = new Set([...title, ...category, ...description]);

  for (const skill of profile.skills) {
    if (jobTerms.has(skill)) score += 5;
    else if (title.includes(skill) || category.includes(skill)) score += 3;
  }

  for (const categoryTerm of profile.categories) {
    if (category.includes(categoryTerm)) score += 4;
    else if (jobTerms.has(categoryTerm)) score += 2;
  }

  for (const titleTerm of profile.title) {
    if (title.includes(titleTerm)) score += 4;
    else if (category.includes(titleTerm)) score += 2;
  }

  if (
    profile.location &&
    jobLocation &&
    jobLocation.includes(profile.location)
  ) {
    score += 5;
  }

  if (
    job.workType &&
    normalize(job.workType) === "remote"
  ) {
    score += 1;
  }

  // Keep editorial and subscription boosts separate from relevance.
  score += job.source === "admin" ? ADMIN_PRIORITY_BOOST : 0;
  score += job.subscriptionBoost || 0;

  return score;
}

function buildSections(jobs) {
  const skillMatches = jobs.filter((job) => job.matchDetails.skills > 0);
  const locationMatches = jobs.filter((job) => job.matchDetails.location);
  const recent = [...jobs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return {
    recommended: jobs.slice(0, 12),
    skillsMatch: skillMatches.slice(0, 8),
    nearby: locationMatches.slice(0, 8),
    recentlyAdded: recent,
    exploreAll: jobs,
  };
}

export async function getTalentRecommendations({
  talentId,
  page = 1,
  limit = 20,
}) {
  const talent = await Talent.findById(talentId).select(
    "jobTitle experienceTime location categories tags",
  ).lean();

  if (!talent) {
    const error = new Error("Talent profile not found.");
    error.status = 404;
    throw error;
  }

  const today = deadlineStart();

  const eligibilityFilter = {
    status: "published",
    isDeleted: false,
    $or: [
      { deadlineDate: null },
      { deadlineDate: { $exists: false } },
      { deadlineDate: { $gte: today } },
    ],
  };

  const [employerJobs, adminJobs] = await Promise.all([
    Job.find(eligibilityFilter)
      .populate(
        "employer",
        "companyName logo selectedPlan paymentStatus planExpiresAt accountStatus",
      )
      .lean(),

    AdminJob.find(eligibilityFilter).lean(),
  ]);

  const profile = candidateProfileTerms(talent);

  const normalizedJobs = [
    ...employerJobs
      .filter((job) => job.employer?.accountStatus === "active")
      .map(normalizeEmployerJob),
    ...adminJobs.map(normalizeAdminJob),
  ];

  const rankedJobs = normalizedJobs
    .map((job) => {
      const title = words(job.jobTitle);
      const category = words(
        `${job.category || ""} ${job.jobCategory || ""}`,
      );

      const skills = profile.skills.filter((skill) =>
        [...title, ...category, ...words(job.jobDescription)].includes(skill),
      ).length;

      const location = Boolean(
        profile.location &&
        normalize(job.location || job.address).includes(profile.location),
      );

      return {
        ...job,
        matchScore: scoreJob(job, profile),
        matchDetails: { skills, location },
      };
    })
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        new Date(b.createdAt) - new Date(a.createdAt),
    )
    .map((job) => ({
      ...job,
      ...jobApplicationMetadata(job),
    }));

  const total = rankedJobs.length;
  const start = (page - 1) * limit;
  const paginatedJobs = rankedJobs.slice(start, start + limit);

  return {
    sections: buildSections(rankedJobs),
    jobs: paginatedJobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: start + limit < total,
    },
    profile: {
      hasSkills: profile.skills.length > 0,
      hasCategories: profile.categories.length > 0,
      hasLocation: Boolean(profile.location),
    },
  };
}
