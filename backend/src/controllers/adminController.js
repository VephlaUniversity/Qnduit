import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import Job from "../models/Job.js";
import Meeting from "../models/Meeting.js";

// ADMIN DASHBOARD

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      jobs,
      employers,
      talents,
      savedCandidates,
      meetings,
      recentTalents,
      recentEmployers,
      recentJobs,
      chartData,
    ] = await Promise.all([
      Job.countDocuments({ isDeleted: false }),

      Employer.countDocuments(),

      Talent.countDocuments(),

      Employer.aggregate([
        {
          $project: {
            savedCount: {
              $size: {
                $ifNull: ["$savedCandidates", []],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$savedCount",
            },
          },
        },
      ]),

      Meeting.countDocuments({
        isDeleted: false,
      }),

      Talent.find()
        .select(
          "firstName lastName fullName email jobTitle location isVerified accountStatus createdAt avatar"
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Employer.find()
        .select(
          "firstName lastName companyName displayName email location isVerified accountStatus createdAt logo paymentStatus"
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Job.find({ isDeleted: false })
        .populate(
          "employer",
          "companyName displayName firstName lastName"
        )
        .select(
          "jobTitle location workType applicantsCount status deadlineDate createdAt flagged"
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      getJobChartData(),
    ]);

    const wishlistCount = savedCandidates[0]?.total || 0;

    res.json({
      success: true,

      stats: {
        jobs,
        employers,
        candidates: talents,
        reviews: meetings,
        wishlist: wishlistCount,
      },

      chartData,

      recentCandidates: recentTalents,
      recentEmployers,
      recentJobs,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard",
    });
  }
};

// TALENTS 
export const getAdminTalents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sort = "-createdAt",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const filter = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex },
        { email: regex },
        { jobTitle: regex },
        { location: regex },
      ];
    }

    const [talents, total] = await Promise.all([
      Talent.find(filter)
        .select(
          "firstName lastName fullName email jobTitle location isVerified accountStatus createdAt avatar"
        )
        .sort(sort)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      Talent.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: talents,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get admin talents error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load candidates",
    });
  }
};

// UPDATE TALENT STATUS
export const updateTalentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const talent = await Talent.findByIdAndUpdate(
      id,
      {
        accountStatus: status,
      },
      {
        new: true,
      }
    ).select("-password");

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.json({
      success: true,
      message: `Candidate ${status === "active" ? "reactivated" : "suspended"}`,
      data: talent,
    });
  } catch (error) {
    console.error("Update talent status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update candidate status",
    });
  }
};

// DELETE TALENT
export const deleteTalent = async (req, res) => {
  try {
    const { id } = req.params;

    const talent = await Talent.findByIdAndDelete(id);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.json({
      success: true,
      message: "Candidate deleted successfully",
    });
  } catch (error) {
    console.error("Delete talent error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete candidate",
    });
  }
};

// TALENT VERIFICATION
export const updateTalentVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const talent = await Talent.findById(id);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found",
      });
    }

    talent.isVerified = Boolean(verified);

    await talent.save();

    res.json({
      success: true,
      message: talent.isVerified
        ? "Candidate verified successfully"
        : "Candidate unverified successfully",
      talent,
    });
  } catch (error) {
    console.error("Update talent verification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update candidate verification",
    });
  }
};


// EMPLOYERS
export const getAdminEmployers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sort = "-createdAt",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const filter = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { companyName: regex },
        { displayName: regex },
        { email: regex },
        { companyIndustry: regex },
        { location: regex },
      ];
    }

    const [employers, total] = await Promise.all([
      Employer.find(filter)
        .select(
          "firstName lastName companyName displayName email companyIndustry location address isVerified accountStatus createdAt logo paymentStatus selectedPlan"
        )
        .sort(sort)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      Employer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: employers,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get admin employers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employers",
    });
  }
};

// EMPLOYER STATUS
export const updateEmployerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const employer = await Employer.findByIdAndUpdate(
      id,
      {
        accountStatus: status,
      },
      {
        new: true,
      }
    ).select("-password");

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.json({
      success: true,
      message: `Employer ${
        status === "active" ? "reactivated" : "suspended"
      }`,
      data: employer,
    });
  } catch (error) {
    console.error("Update employer status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update employer status",
    });
  }
};

//EMPLOYER VERIFICATION
export const updateEmployerVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const employer = await Employer.findById(id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    employer.isVerified = Boolean(verified);

    await employer.save();

    res.json({
      success: true,
      message: employer.isVerified
        ? "Employer verified successfully"
        : "Employer unverified successfully",
      employer,
    });
  } catch (error) {
    console.error("Update employer verification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update employer verification",
    });
  }
};

// DELETE EMPLOYER
export const deleteEmployer = async (req, res) => {
  try {
    const { id } = req.params;

    const employer = await Employer.findByIdAndDelete(id);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    res.json({
      success: true,
      message: "Employer deleted successfully",
    });
  } catch (error) {
    console.error("Delete employer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete employer",
    });
  }
};

// JOBS
export const getAdminJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sort = "-createdAt",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const filter = {
      isDeleted: false,
    };

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { jobTitle: regex },
        { location: regex },
        { category: regex },
        { workType: regex },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate(
          "employer",
          "companyName displayName firstName lastName email"
        )
        .sort(sort)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get admin jobs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load jobs",
    });
  }
};

// GET JOBS
export const getAdminJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate(
        "employer",
        "companyName displayName firstName lastName email location"
      )
      .lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get admin job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load job",
    });
  }
};

// JOB FLAG
export const toggleJobFlag = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    job.flagged = !job.flagged;

    await job.save();

    res.json({
      success: true,
      message: job.flagged
        ? "Job flagged successfully"
        : "Job unflagged successfully",
      data: job,
    });
  } catch (error) {
    console.error("Toggle job flag error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update job flag",
    });
  }
};

// DELETE JOB
export const deleteAdminJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );

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
    console.error("Delete admin job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete job",
    });
  }
};


//JOB CHART
const getJobChartData = async () => {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [day, week, month, year] = await Promise.all([

    Job.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: {
            $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$createdAt" },
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.hour": 1,
        },
      },
    ]),

    Job.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: {
            $gte: startOfWeek,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            dayOfYear: { $dayOfYear: "$createdAt" },
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.dayOfYear": 1,
        },
      },
    ]),

    Job.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: {
            $gte: startOfYear,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            monthNumber: { $month: "$createdAt" },
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.monthNumber": 1,
        },
      },
    ]),

    // ALL YEARS
    Job.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
        },
      },
    ]),
  ]);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const dayData = Array.from({ length: 24 }, (_, hour) => {
    const found = day.find(
      (item) => item?._id?.hour === hour
    );

    return {
      name: `${hour}:00`,
      value: found?.value || 0,
    };
  });

  const weekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);

    const yearNumber = date.getFullYear();

    const startOfYearForDate = new Date(
      yearNumber,
      0,
      1
    );

    const dayOfYear =
      Math.floor(
        (date - startOfYearForDate) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const found = week.find(
      (item) =>
        item?._id?.year === yearNumber &&
        item?._id?.dayOfYear === dayOfYear
    );

    return {
      name: formatDate(date),
      value: found?.value || 0,
    };
  });

  const monthData = Array.from(
    { length: 12 },
    (_, index) => {
      const monthNumber = index + 1;

      const found = month.find(
        (item) =>
          item?._id?.year === now.getFullYear() &&
          item?._id?.monthNumber === monthNumber
      );

      return {
        name: new Date(
          now.getFullYear(),
          index,
          1
        ).toLocaleDateString("en-US", {
          month: "short",
        }),
        value: found?.value || 0,
      };
    }
  );

  const yearData = year.map((item) => ({
    name: String(item?._id?.year),
    value: item?.value || 0,
  }));

  return {
    day: dayData,
    week: weekData,
    month: monthData,
    year: yearData,
  };
};