import React, { useState, useRef, useEffect } from "react";
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

const stats = [
  { icon: Briefcase, label: "Jobs", value: "158000", color: "bg-blue-600" },
  { icon: ScanSearch, label: "Employers", value: "2068", color: "bg-red-600" },
  { icon: Star, label: "Reviews", value: "21", color: "bg-emerald-600" },
  { icon: Bookmark, label: "Wishlist", value: "320", color: "bg-yellow-500" },
];

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
  Unverified: "text-red-500",
  Pending: "text-yellow-500",
};

// Row action menu — same four actions for both candidates and employers:
// Verify User, Unverify User, Reset Password, Delete User.
const RowActions = ({ row, onChange, onResetPassword, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 text-sm">
          <button
            onClick={() => {
              onChange("Verified");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
          >
            <BadgeCheck className="w-4 h-4" />
            Verify User
          </button>
          <button
            onClick={() => {
              onChange("Unverified");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <BadgeMinus className="w-4 h-4" />
            Unverify User
          </button>
          <button
            onClick={() => {
              onResetPassword?.(row);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Reset Password
          </button>
          <button
            onClick={() => {
              onDelete?.(row);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </button>
        </div>
      )}
    </div>
  );
};

const SignupTable = ({
  title,
  rows,
  onRowChange,
  onViewAll,
  onResetPassword,
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
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, i) => (
            <tr key={row.email} className="text-sm">
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
                    onChange={(status) => onRowChange(i, status)}
                    onResetPassword={onResetPassword}
                    onDelete={() => onDelete(i, row)}
                  />
                  <button
                    onClick={() => toast.info(`Viewing profile for ${row.name}`)}
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
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [candidateRows, setCandidateRows] = useState(candidates);
  const [employerRows, setEmployerRows] = useState(employers);

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
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
                    {stat.value}
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
          <BarChart data={chartData[period]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />
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
        rows={candidateRows}
        onViewAll={() => navigate("/admin-dashboard/candidates")}
        onRowChange={(i, status) => {
          setCandidateRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status } : r)),
          );
          toast.success(`Candidate marked as ${status}`);
        }}
        onResetPassword={(row) =>
          toast.success(`Password reset link sent to ${row.email}`)
        }
        onDelete={(i, row) => {
          setCandidateRows((prev) => prev.filter((_, idx) => idx !== i));
          toast.success(`${row.name} deleted`);
        }}
      />

      <SignupTable
        title="Recent Employers Signups"
        rows={employerRows}
        onViewAll={() => navigate("/admin-dashboard/employers")}
        onRowChange={(i, status) => {
          setEmployerRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status } : r)),
          );
          toast.success(`Employer marked as ${status}`);
        }}
        onResetPassword={(row) =>
          toast.success(`Password reset link sent to ${row.email}`)
        }
        onDelete={(i, row) => {
          setEmployerRows((prev) => prev.filter((_, idx) => idx !== i));
          toast.success(`${row.name} deleted`);
        }}
      />
    </div>
  );
};

export default AdminOverview;
