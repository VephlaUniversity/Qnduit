// middleware/checkPlanAccess.js
import { PLANS } from "../config/plans.js";
import Employer from "../models/Employer.js";

export const checkPlanLimit = (feature) => {
  return async (req, res, next) => {
    const employer = await Employer.findById(req.user._id);

    const plan = employer.selectedPlan;
    const isExpired =
      employer.planExpiresAt && employer.planExpiresAt < new Date();

    const isTrialExpired =
      employer.trialEndsAt && employer.trialEndsAt < new Date();

    if (isExpired || isTrialExpired) {
      return res.status(403).json({
        message: "Plan expired. Please upgrade.",
      });
    }

    const limits = PLANS[plan]?.limits;

    if (!limits) return next();

    // Example: job posts
    if (feature === "jobPosts") {
      const jobCount = await Job.countDocuments({ employerId: employer._id });

      if (jobCount >= limits.jobPosts) {
        return res.status(403).json({
          message: "Job post limit reached. Upgrade plan.",
        });
      }
    }

    next();
  };
};