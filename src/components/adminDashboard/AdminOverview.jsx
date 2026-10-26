import { AdminDeleteUserDialog } from "./AdminDeleteUserDialog";
import { useAdminDeleteUser } from "../hooks/useAdminDeleteUser";
import { AdminPasswordResetDialog } from "./AdminPasswordResetDialog";
import { useAdminPasswordReset } from "../hooks/useAdminPasswordReset";
import { AdminProfileDialog } from "./AdminProfileDialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ScanSearch,
  Star,
  Bookmark,
  MoreVertical,
  BadgeCheck,
  BadgeMinus,
  KeyRound,
  Trash2,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { badgeLabel } from "../utils/adminVerification";
import { useAdminBadgeActions } from "../hooks/useAdminBadgeActions";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";

/*const stats = [
  { icon: Briefcase, label: "Jobs", value: "158000", color: "bg-blue-600" },
  { icon: ScanSearch, label: "Employers", value: "2068", color: "bg-red-600" },
  { icon: Star, label: "Reviews", value: "21", color: "bg-emerald-600" },
  { icon: Bookmark, label: "Wishlist", value: "320", color: "bg-yellow-500" },
];*/

const chartData = {
  month: [
    { name: "Jan", value: 150 },
    { name: "Feb", value: 128 },
    { name: "Mar", value: 105 },
    { name: "Apr", value: 120 },
    { name: "Jun", value: 108 },
    { name: "Jul", value: 92 },
    { name: "Aug", value: 88 },
    { name: "Sep", value: 78 },
    { name: "Oct", value: 68 },
    { name: "Nov", value: 58 },
    { name: "Dec", value: 100 },
  ],
  day: Array.from({ length: 24 }, (_, i) => ({
    name: `${i}:00`,
    value: Math.floor(Math.random() * 60) + 20,
  })),
  week: [
    { name: "Mon", value: 90 },
    { name: "Tue", value: 110 },
    { name: "Wed", value: 95 },
    { name: "Thu", value: 130 },
    { name: "Fri", value: 105 },
    { name: "Sat", value: 60 },
    { name: "Sun", value: 45 },
  ],
  year: [
    { name: "2021", value: 3200 },
    { name: "2022", value: 4100 },
    { name: "2023", value: 5300 },
    { name: "2024", value: 6400 },
    { name: "2025", value: 7100 },
  ],
};

const candidates = [
  {
    name: "John Doe",
    email: "johndoe@gmail.com",
    date: "12 Apr 2025",
    category: "Cybersecurity",
    status: "Verified",
  },
  {
    name: "Adam Scott",
    email: "adam2@gmail.com",
    date: "22 Mar 2025",
    category: "Cloud",
    status: "Verified",
  },
  {
    name: "Natasha Williams",
    email: "natash3@gmail.com",
    date: "13 Feb 2025",
    category: "Cybersecurity",
    status: "Unverified",
  },
  {
    name: "Harvey Biden",
    email: "harv234@gmail.com",
    date: "18 Jan 2025",
    category: "Cloud",
    status: "Verified",
  },
];

const employers = [
  {
    name: "Cybrary",
    email: "cybrary@gmail.com",
    date: "17 Mar 2025",
    category: "Cybersecurity",
    status: "Verified",
  },
  {
    name: "Coana",
    email: "coana@gmail.com",
    date: "10 Mar 2025",
    category: "Cybersecurity",
    status: "Verified",
  },
  {
    name: "Azure",
    email: "azure@gmail.com",
    date: "17 Feb 2025",
    category: "Cloud",
    status: "Unverified",
  },
  {
    name: "Skate",
    email: "skate@gmail.com",
    date: "19 Jan 2025",
    category: "Cloud",
    status: "Pending",
  },
];

const statusColor = {
  Verified: "text-emerald-500",
  "Unverified": "text-gray-400",
};

// Portal menus escape table overflow; non-modal mode avoids locking page scroll.
const RowActions = ({ row, onChange, onResetPassword, onDelete, pending, resetDisabled }) => {
  const trigger = useRef(null);
  return (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        ref={trigger}
        aria-label={`Actions for ${row.name}`}
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      sideOffset={6}
      avoidCollisions
      collisionPadding={8}
      sticky="always"
      className="w-48 max-w-[calc(100vw-1rem)] bg-[#2A2A2E] border-white/10 text-gray-200"
    >
      <DropdownMenuItem disabled={pending} onSelect={() => onChange(true)} className="cursor-pointer focus:bg-blue-600 focus:text-white">
        <BadgeCheck className="w-4 h-4" />
        Verify User
      </DropdownMenuItem>
      <DropdownMenuItem disabled={pending} onSelect={() => onChange(false)} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <BadgeMinus className="w-4 h-4" />
        Unverify User
      </DropdownMenuItem>
      <DropdownMenuItem disabled={pending || resetDisabled} onSelect={() => onResetPassword?.(row, trigger.current)} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <KeyRound className="w-4 h-4" />
        Reset Password
      </DropdownMenuItem>
      <DropdownMenuItem disabled={pending} onSelect={() => onDelete?.(row, trigger.current)} className="cursor-pointer text-red-500 focus:bg-white/10 focus:text-red-500">
        <Trash2 className="w-4 h-4" />
        Delete User
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  );
};

const SignupTable = ({
  title,
  rows,
  onRowChange,
  isPending,
  onViewAll,
  onViewProfile,
  onResetPassword,
  resetDisabled,
  onDelete,
}) => (
  <div className="bg-[#1A1A1E] rounded-lg border border-white/5 mb-8">
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <button
        onClick={onViewAll}
        className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
      >
        View all <span aria-hidden>→</span>
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-y border-white/5">
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-6 py-3 font-medium">Email</th>
            <th className="px-6 py-3 font-medium">Date Joined</th>
            <th className="px-6 py-3 font-medium">Category</th>
            <th className="px-6 py-3 font-medium">Badge</th>
            <th className="px-6 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row._id} className="text-sm">
              <td className="px-6 py-4 text-white font-medium">{row.name}</td>
              <td className="px-6 py-4 text-blue-400">{row.email}</td>
              <td className="px-6 py-4 text-gray-400">{row.date}</td>
              <td className="px-6 py-4 text-gray-400">{row.category}</td>
              <td className={`px-6 py-4 font-medium ${statusColor[row.status]}`}>
                {row.status}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <RowActions
                    row={row}
                    onChange={(verified) => onRowChange(row._id, verified)}
                    pending={isPending(row._id)}
                    onResetPassword={onResetPassword}
                    resetDisabled={resetDisabled}
                    onDelete={onDelete}
                  />
                  <button
                    onClick={event => onViewProfile(row._id, event.currentTarget)}
                    className="px-4 py-2 rounded-lg bg-[#2A2A2E] hover:bg-white/10 text-white text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Profile
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2A2A2E] border border-white/10 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium text-sm">
          {payload[0].payload.name}
        </p>
        <p className="text-blue-400 text-sm">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const AdminOverview = () => {
  const passwordReset = useAdminPasswordReset();
  const [profileSubject, setProfileSubject] = useState(null);
  const navigate = useNavigate();

  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    jobs: 0,
    employers: 0,
    candidates: 0,
    reviews: 0,
    wishlist: 0,
  });

  const [chartData, setChartData] = useState({
    day: [],
    week: [],
    month: [],
    year: [],
  });

  const [candidateRows, setCandidateRows] = useState([]);
  const [employerRows, setEmployerRows] = useState([]);

  const badges = useAdminBadgeActions({
    refresh: () => loadDashboard(),
    onSaved(type, account) {
      const update = type === "talent" ? setCandidateRows : setEmployerRows;
      update(rows => rows.map(row => String(row._id) === account._id ? { ...row, ...account } : row));
    },
  });
  const beginBadgeRead = badges.beginRead;

  const loadDashboard = useCallback(async () => {
    const read = beginBadgeRead();
    try {
      setLoading(true);

      const token = read.token;

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/dashboard`,
        {
          signal: read.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!read.current()) return false;

      setStats(res.data.stats);
      setChartData(
        res.data.chartData || {
          day: [],
          week: [],
          month: [],
          year: [],
        }
      );

      setCandidateRows(res.data.recentCandidates || []);
      setEmployerRows(res.data.recentEmployers || []);
      return true;
    } catch (error) {
      if (!read.current()) return false;
      console.error("Admin dashboard error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load dashboard"
      );
    } finally {
      if (read.current()) setLoading(false);
      read.finish();
    }
  }, [beginBadgeRead]);


  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const deletion = useAdminDeleteUser((type, id) => {
    const update = type === "talent" ? setCandidateRows : setEmployerRows;
    update(rows => rows.filter(row => String(row._id) !== id));
    loadDashboard();
  });

  const statCards = [
    {
      icon: Briefcase,
      label: "Jobs",
      value: stats.jobs,
      color: "bg-blue-600",
    },
    {
      icon: ScanSearch,
      label: "Employers",
      value: stats.employers,
      color: "bg-red-600",
    },
    {
      icon: Star,
      label: "Reviews",
      value: stats.reviews,
      color: "bg-emerald-600",
    },
    {
      icon: Bookmark,
      label: "Wishlist",
      value: stats.wishlist,
      color: "bg-yellow-500",
    },
  ];

  const candidateTableRows = candidateRows.map((candidate) => ({
    ...candidate,
    name:
      candidate.fullName ||
      `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),

    date: new Date(candidate.createdAt).toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ),

    category: candidate.jobTitle || "Not specified",

    status: badgeLabel(candidate),
  }));

  const employerTableRows = employerRows.map((employer) => ({
    ...employer,

    name:
      employer.companyName ||
      employer.displayName ||
      `${employer.firstName || ""} ${employer.lastName || ""}`.trim(),

    date: new Date(employer.createdAt).toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ),

    category:
      employer.companyIndustry || "Not specified",

    status: badgeLabel(employer),
  }));

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <AdminProfileDialog subject={profileSubject} onClose={() => setProfileSubject(null)} />
      <AdminPasswordResetDialog flow={passwordReset} />
      <AdminDeleteUserDialog flow={deletion} />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 tabIndex={-1} className="text-2xl md:text-3xl font-semibold text-white">
          Dashboard
        </h1>
        <button type="button" onClick={() => navigate("/admin-dashboard/admin-jobs?create=1")} className="ml-auto min-h-11 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Post Job</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-4 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div>
                  <div className="text-3xl font-bold text-white">
                    {loading ? "..." : stat.value.toLocaleString()}
                  </div>

                  <div className="text-gray-400 text-sm mt-1">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jobs Overview chart — full width, notification panel removed */}
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-white">Jobs Overview</h2>
          <div className="flex gap-2">
            {["day", "week", "month", "year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData?.[period] || []}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#ffffff10"
            />

            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF" }}
              axisLine={{ stroke: "#ffffff20" }}
            />

            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF" }}
              axisLine={{ stroke: "#ffffff20" }}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="value"
              fill="#2563eb"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SignupTable
        title="Recent Candidate Signups"
        onDelete={(row, trigger) => deletion.open({ type: "talent", id: String(row._id), name: row.name, trigger })}
        rows={candidateTableRows}
        resetDisabled={passwordReset.disabled}
        onResetPassword={(row, trigger) => passwordReset.open({ type: "talent", id: row._id, name: row.name, email: row.email, trigger })}
        onViewProfile={(id, trigger) => setProfileSubject({ type: "talent", id, trigger })}
        onRowChange={(id, verified) => badges.setBadge("talent", id, verified)}
        isPending={id => badges.pending("talent", id)}
        onViewAll={() =>
          navigate("/admin-dashboard/candidates")
        }
      />

      <SignupTable
        title="Recent Employers Signups"
        onDelete={(row, trigger) => deletion.open({ type: "employer", id: String(row._id), name: row.name, trigger })}
        rows={employerTableRows}
        resetDisabled={passwordReset.disabled}
        onResetPassword={(row, trigger) => passwordReset.open({ type: "employer", id: row._id, name: row.name, email: row.email, trigger })}
        onViewProfile={(id, trigger) => setProfileSubject({ type: "employer", id, trigger })}
        onRowChange={(id, verified) => badges.setBadge("employer", id, verified)}
        isPending={id => badges.pending("employer", id)}
        onViewAll={() =>
          navigate("/admin-dashboard/employers")
        }
      />
    </div>
  );
};

export default AdminOverview;
