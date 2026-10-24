import { profileViewSummaryRange } from "../utils/profileViewSummary.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import ProfileView, {
  ensureProfileViewIndexes,
} from "../models/ProfileView.js";
import Follow from "../models/Follow.js";
import EmployerTalentFollow from "../models/EmployerTalentFollow.js";

const models = { talent: Talent, employer: Employer };
const fields = {
  talent:
    "firstName lastName fullName jobTitle aboutMe address location categories tags avatar qualification experienceTime language introVideo",
  employer:
    "companyName displayName accountType companyIndustry aboutCompany aboutYou address location categories logo introVideo",
};
const strings = (values) =>
  Array.isArray(values)
    ? values.filter((value) => typeof value === "string")
    : [];
const text = (value) => (typeof value === "string" ? value : "");
const image = (value) => text(value?.url);

// Explicit output allowlists, independent of schema additions and query projections.
const displayProfile = (type, record) => {
  const common = {
    id: String(record._id),
    userType: type,
    address: text(record.address),
    location: text(record.location),
    categories: strings(record.categories),
  };
  return type === "talent"
    ? {
        ...common,
        firstName: text(record.firstName),
        lastName: text(record.lastName),
        fullName: text(record.fullName),
        jobTitle: text(record.jobTitle),
        aboutMe: text(record.aboutMe),
        avatar: image(record.avatar),
        qualification: text(record.qualification),
        experienceTime: text(record.experienceTime),
        language: text(record.language),
        tags: strings(record.tags),
        introVideo: text(record.introVideo?.url),
      }
    : {
        ...common,
        companyName: text(record.companyName),
        displayName: text(record.displayName),
        accountType: text(record.accountType),
        companyIndustry: text(record.companyIndustry),
        aboutCompany: text(record.aboutCompany),
        aboutYou: text(record.aboutYou),
        logo: image(record.logo),
        introVideo: text(record.introVideo),
      };
};

const isSelf = (req) =>
  req.user.role === req.params.userType &&
  String(req.user._id) === req.params.userId.toLowerCase();

export const validateProfileTarget = (req, res, next) => {
  if (
    !Object.hasOwn(models, req.params.userType) ||
    !/^[a-f\d]{24}$/i.test(req.params.userId)
  ) {
    return res.status(400).json({ message: "Invalid profile type or ID" });
  }
  next();
};

const findTarget = async (req, res) => {
  const { userType, userId } = req.params;
  const target = await models[userType]
    .findById(userId)
    .select(`${fields[userType]} showProfile accountStatus isVerified`)
    .lean();
  if (
    !target ||
    target.accountStatus === "suspended" ||
    !target.isVerified ||
    (target.showProfile === "hidden" && !isSelf(req))
  ) {
    res.status(404).json({ message: "Profile not found" });
    return null;
  }
  return target;
};

export const getUserProfile = async (req, res, next) => {
  try {
    const target = await findTarget(req, res);
    if (!target) return;
    const { userType, userId } = req.params;
    const canFollow = !isSelf(req) && req.user.role !== userType;
    let isFollowing = false;
    if (canFollow) {
      isFollowing = Boolean(
        await (req.user.role === "talent"
          ? Follow.exists({ talent: req.user._id, employer: userId })
          : EmployerTalentFollow.exists({
              employer: req.user._id,
              talent: userId,
            })),
      );
    }
    res.set("Cache-Control", "private, no-store");
    res.json({
      profile: displayProfile(userType, target),
      canFollow,
      isFollowing,
      isSelf: isSelf(req),
    });
  } catch (error) {
    next(error);
  }
};

export const recordProfileView = async (req, res, next) => {
  try {
    if (!(await findTarget(req, res))) return;
    if (isSelf(req)) return res.json({ recorded: false, reason: "self" });
    await ensureProfileViewIndexes();
    const now = new Date();
    const key = {
      targetType: req.params.userType,
      targetId: req.params.userId,
      viewerType: req.user.role,
      viewerId: req.user._id,
      day: now.toISOString().slice(0, 10),
    };
    // The unique index is required in production too, even if autoIndex is off.
    let recorded = false;
    try {
      const result = await ProfileView.updateOne(
        key,
        { $setOnInsert: { ...key, viewedAt: now } },
        { upsert: true },
      );
      recorded = result.upsertedCount === 1;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    res.json({ recorded, reason: recorded ? "recorded" : "repeat" });
  } catch (error) {
    next(error);
  }
};

const viewerSummary = (type, record) => {
  if (
    !record ||
    record.accountStatus === "suspended" ||
    record.showProfile === "hidden" ||
    !record.isVerified
  ) {
    return {
      id: null,
      userType: type,
      name: "Profile unavailable",
      imageUrl: "",
    };
  }
  const name =
    type === "talent"
      ? record.fullName ||
        [record.firstName, record.lastName].filter(Boolean).join(" ") ||
        "Talent"
      : (record.accountType === "individual"
          ? record.displayName
          : record.companyName) ||
        record.companyName ||
        record.displayName ||
        "Employer";
  return {
    id: String(record._id),
    userType: type,
    name,
    imageUrl: image(type === "talent" ? record.avatar : record.logo),
  };
};

export const getProfileViews = async (req, res, next) => {
  try {
    // Check ownership before fetching any target or history data.
    if (!isSelf(req))
      return res
        .status(403)
        .json({ message: "Only the profile owner can view this history" });
    if (!(await findTarget(req, res))) return;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        message: "Invalid pagination: page >= 1 and limit 1–50 required",
      });
    }
    const filter = { targetType: req.params.userType, targetId: req.user._id };
    const [rows, total] = await Promise.all([
      ProfileView.find(filter)
        .sort({ viewedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProfileView.countDocuments(filter),
    ]);
    // Batch by role; never populate full account records or return contact details.
    const summaries = new Map();
    await Promise.all(
      Object.entries(models).map(async ([type, Model]) => {
        const ids = rows
          .filter((row) => row.viewerType === type)
          .map((row) => row.viewerId);
        const people = await Model.find({ _id: { $in: ids } })
          .select(
            "firstName lastName fullName companyName displayName accountType avatar logo showProfile accountStatus isVerified",
          )
          .lean();
        for (const person of people)
          summaries.set(`${type}:${person._id}`, viewerSummary(type, person));
      }),
    );
    res.set("Cache-Control", "private, no-store");
    res.json({
      views: rows.map((row) => ({
        id: String(row._id),
        viewedAt: row.viewedAt,
        viewer:
          summaries.get(`${row.viewerType}:${row.viewerId}`) ||
          viewerSummary(row.viewerType, null),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      repeatPolicy:
        "One view per viewer and profile per UTC calendar day; self-views excluded.",
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileViewSummary = async (req, res, next) => {
  try {
    if (!isSelf(req)) return res.status(403).json({ message: "Only the profile owner can view this summary" });
    const period = req.query.period ?? "month";
    const range = profileViewSummaryRange(period);
    if (!range) return res.status(400).json({ message: "Period must be day, week, month or year." });
    if (!(await findTarget(req, res))) return;
    const counts = await ProfileView.aggregate([
      { $match: { targetType: req.params.userType, targetId: req.user._id, viewedAt: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: { $dateToString: { date: "$viewedAt", format: range.format, timezone: "UTC" } }, views: { $sum: 1 } } },
    ]);
    const byKey = new Map(counts.map(row => [row._id, row.views]));
    const buckets = range.buckets.map(({ key, ...bucket }) => ({ ...bucket, views: byKey.get(key) || 0 }));
    res.json({ period, timezone: "UTC", range: { start: range.start.toISOString(), end: range.end.toISOString(), endExclusive: true },
      buckets, total: buckets.reduce((sum, bucket) => sum + bucket.views, 0),
      repeatPolicy: "One first qualifying visit per viewer and profile per UTC calendar day; self-views excluded." });
  } catch (error) { next(error); }
};
