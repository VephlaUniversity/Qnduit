import mongoose from "mongoose";
import Follow from "../models/Follow.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import EmployerTalentFollow from "../models/EmployerTalentFollow.js";


const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
  );

  return { page, limit, skip: (page - 1) * limit };
};

const paginationResult = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const employerFields =
  "companyName displayName email location companyIndustry categories tags logo profileURL accountType";

const talentFields =
  "firstName lastName fullName email jobTitle location categories tags avatar qualification experienceTime aboutMe showProfile accountStatus isVerified";

// Preserve relationships and public row fields; only indicate whether navigation is available.
const talentListFields = (talent) => {
  const { showProfile, accountStatus, isVerified, ...fields } = talent;
  return { ...fields, profileAvailable: Boolean(isVerified) && accountStatus !== "suspended" && showProfile !== "hidden" };
};

const employerName = (employer) =>
  employer.displayName || employer.companyName || "Employer";

const talentName = (talent) =>
  talent.fullName ||
  [talent.firstName, talent.lastName].filter(Boolean).join(" ") ||
  "Talent";

const employerSearchConditions = (q) => {
  if (!q) return {};

  const regex = new RegExp(escapeRegex(q), "i");

  return {
    $or: [
      { companyName: regex },
      { displayName: regex },
      { email: regex },
      { location: regex },
      { companyIndustry: regex },
      { categories: regex },
      { tags: regex },
    ],
  };
};

const talentSearchConditions = (q) => {
  if (!q) return {};

  const regex = new RegExp(escapeRegex(q), "i");

  return {
    $or: [
      { fullName: regex },
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { jobTitle: regex },
      { location: regex },
      { categories: regex },
      { tags: regex },
    ],
  };
};

// GET /api/follows/employers/search
export const searchEmployers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const q = String(req.query.q || "").trim();
    const filter = employerSearchConditions(q);

    const [employers, total] = await Promise.all([
      Employer.find(filter)
        .select(employerFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employer.countDocuments(filter),
    ]);

    const employerIds = employers.map((employer) => employer._id);

    const followed = await Follow.find({
      talent: req.user._id,
      employer: { $in: employerIds },
    })
      .select("employer")
      .lean();

    const followedIds = new Set(
      followed.map((item) => String(item.employer))
    );

    res.json({
      success: true,
      data: employers.map((employer) => ({
        ...employer,
        id: String(employer._id),
        name: employerName(employer),
        isFollowing: followedIds.has(String(employer._id)),
      })),
      pagination: paginationResult(page, limit, total),
    });
  } catch (error) {
    console.error("Search employers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search employers.",
    });
  }
};

// GET /api/follows/employers/following
export const getFollowingEmployers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const q = String(req.query.q || "").trim();

    const matchingEmployers = await Employer.find(
      employerSearchConditions(q)
    )
      .select("_id")
      .lean();

    const employerIds = matchingEmployers.map((item) => item._id);

    const filter = {
      talent: req.user._id,
      employer: { $in: employerIds },
    };

    const [follows, total] = await Promise.all([
      Follow.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("employer", employerFields)
        .lean(),
      Follow.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: follows
        .filter((item) => item.employer)
        .map((item) => ({
          ...item.employer,
          id: String(item.employer._id),
          name: employerName(item.employer),
          isFollowing: true,
          followedAt: item.createdAt,
        })),
      pagination: paginationResult(page, limit, total),
    });
  } catch (error) {
    console.error("Get following employers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load followed employers.",
    });
  }
};

// POST /api/follows/employers/:employerId
export const followEmployer = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!mongoose.isValidObjectId(employerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer ID.",
      });
    }

    const employer = await Employer.findById(employerId).select("_id");

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found.",
      });
    }

    await Follow.updateOne(
      {
        talent: req.user._id,
        employer: employer._id,
      },
      {
        $setOnInsert: {
          talent: req.user._id,
          employer: employer._id,
        },
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Employer followed successfully.",
      isFollowing: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: "You already follow this employer.",
        isFollowing: true,
      });
    }

    console.error("Follow employer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to follow employer.",
    });
  }
};

// DELETE /api/follows/employers/:employerId
export const unfollowEmployer = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!mongoose.isValidObjectId(employerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer ID.",
      });
    }

    await Follow.deleteOne({
      talent: req.user._id,
      employer: employerId,
    });

    res.json({
      success: true,
      message: "Employer unfollowed successfully.",
      isFollowing: false,
    });
  } catch (error) {
    console.error("Unfollow employer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow employer.",
    });
  }
};

// GET /api/follows/status/:employerId
export const getFollowStatus = async (req, res) => {
  try {
    const { employerId } = req.params;

    if (!mongoose.isValidObjectId(employerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer ID.",
      });
    }

    const follow = await Follow.exists({
      talent: req.user._id,
      employer: employerId,
    });

    res.json({
      success: true,
      isFollowing: Boolean(follow),
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check follow status.",
    });
  }
};

// GET /api/follows/talents/followers
export const getEmployerFollowers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const q = String(req.query.q || "").trim();

    // Search Talent first, before pagination. This ensures that matches
    // are not restricted to the current page of followers.
    const matchingTalents = await Talent.find(talentSearchConditions(q))
      .select("_id")
      .lean();

    const talentIds = matchingTalents.map((item) => item._id);

    const filter = {
      employer: req.user._id,
      talent: { $in: talentIds },
    };

    const [follows, total] = await Promise.all([
      Follow.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("talent", talentFields)
        .lean(),
      Follow.countDocuments(filter),
    ]);

    const followerTalentIds = follows
      .filter((item) => item.talent)
      .map((item) => item.talent._id);

    const employerFollowing = await EmployerTalentFollow.find({
      employer: req.user._id,
      talent: { $in: followerTalentIds },
    })
      .select("talent")
      .lean();

    const followingIds = new Set(
      employerFollowing.map((item) => String(item.talent))
    );

    res.json({
      success: true,
      data: follows
        .filter((item) => item.talent)
        .map((item) => ({
          ...talentListFields(item.talent),
          id: String(item.talent._id),
          name: talentName(item.talent),
          followedAt: item.createdAt,
          isFollowing: followingIds.has(String(item.talent._id)),
        })),
      pagination: paginationResult(page, limit, total),
    });
  } catch (error) {
    console.error("Get employer followers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load followers.",
    });
  }
};

// POST /api/follows/talents/:talentId
export const followTalent = async (req, res) => {
  try {
    const { talentId } = req.params;

    if (!mongoose.isValidObjectId(talentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid talent ID.",
      });
    }

    const talent = await Talent.findById(talentId).select("_id");

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found.",
      });
    }

    await EmployerTalentFollow.updateOne(
      { employer: req.user._id, talent: talent._id },
      {
        $setOnInsert: {
          employer: req.user._id,
          talent: talent._id,
        },
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: "Talent followed successfully.",
      isFollowing: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: "You already follow this talent.",
        isFollowing: true,
      });
    }

    console.error("Follow talent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to follow talent.",
    });
  }
};

// DELETE /api/follows/talents/:talentId
export const unfollowTalent = async (req, res) => {
  try {
    const { talentId } = req.params;

    if (!mongoose.isValidObjectId(talentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid talent ID.",
      });
    }

    await EmployerTalentFollow.deleteOne({
      employer: req.user._id,
      talent: talentId,
    });

    res.json({
      success: true,
      message: "Talent unfollowed successfully.",
      isFollowing: false,
    });
  } catch (error) {
    console.error("Unfollow talent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow talent.",
    });
  }
};

// GET /api/follows/talents/following
export const getEmployerFollowingTalents = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const q = String(req.query.q || "").trim();

    const matchingTalents = await Talent.find(talentSearchConditions(q))
      .select("_id")
      .lean();

    const filter = {
      employer: req.user._id,
      talent: { $in: matchingTalents.map((item) => item._id) },
    };

    const [follows, total] = await Promise.all([
      EmployerTalentFollow.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("talent", talentFields)
        .lean(),
      EmployerTalentFollow.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: follows
        .filter((item) => item.talent)
        .map((item) => ({
          ...talentListFields(item.talent),
          id: String(item.talent._id),
          name: talentName(item.talent),
          isFollowing: true,
          followedAt: item.createdAt,
        })),
      pagination: paginationResult(page, limit, total),
    });
  } catch (error) {
    console.error("Get followed talents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load followed talents.",
    });
  }
};