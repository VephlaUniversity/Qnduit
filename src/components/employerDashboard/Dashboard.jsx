import React, { useState, useEffect, useCallback, useRef } from "react";
import { Briefcase, FileText, Gift, Bookmark, Users, MousePointerClick } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import RecentApplication from "./RecentApplication";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { startMessagePolling } from "../utils/messagePolling";

const Dashboard = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const employerId = user?.id || user?._id;
  if (user?.userType !== "employer" || !employerId || !token) return null;
  // All private dashboard state, including existing children, belongs to this session.
  return <EmployerDashboard key={`${employerId}:${token}`} employerId={employerId} token={token} />;
};

const EmployerDashboard = ({ employerId, token }) => {
  const [chartPeriod, setChartPeriod] = useState("month");
  const [postedJobsCount, setPostedJobsCount] = useState(0);
  const [summary, setSummary] = useState({ data: null, error: false });
  const [wishlistCount, setWishlistCount] = useState(0);

  const summaryLoop = useRef(null);
  const refreshApplicationSummary = useCallback(() => {
    summaryLoop.current?.cancel();
    summaryLoop.current?.wake();
  }, []);

  useEffect(() => {
    let active = true;
    const current = () => active && localStorage.getItem("token") === token;
    const loop = startMessagePolling({
      intervalMs: 15000, maxDelayMs: 60000,
      async run(signal) {
        if (!current()) return false;
        const { data } = await axios.get(`${API_BASE_URL}/api/applications/employer`, {
          headers: { Authorization: `Bearer ${token}` }, params: { summaryOnly: true }, signal, timeout: 15000,
        });
        if (signal.aborted || !current()) return false;
        if (!["totalApplications", "reviewedApplications", "externalTalents", "externalClicks"]
          .every(field => Number.isSafeInteger(data[field]) && data[field] >= 0)) throw new Error("Invalid summary response");
        setSummary({ data, error: false });
      },
      onSuccess() {},
      onError() { if (current()) setSummary(previous => ({ ...previous, error: true })); },
      onUnauthorized() { if (current()) setSummary({ data: null, error: true }); },
    });
    summaryLoop.current = loop;
    loop.wake();
    return () => { active = false; loop.stop(); summaryLoop.current = null; };
  }, [token]);
  const summaryValue = field => summary.data ? String(summary.data[field]) : summary.error ? "—" : "…";

  // Load the independent job and wishlist stats from backend
  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {

      if (!token) {
        console.error("No authentication token found");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          jobsResponse,
          savedCandidatesResponse,
        ] = await Promise.all([
          // Posted Jobs
          axios.get(
            `${API_BASE_URL}/api/jobs/my-jobs`,
            { headers, signal: controller.signal }
          ),

          // Saved Candidates / Wishlist
          axios.get(
            `${API_BASE_URL}/api/employers/saved-candidates`,
            { headers, signal: controller.signal }
          ),
        ]);

        if (controller.signal.aborted) return;
        const jobs = jobsResponse.data?.jobs || [];
        const savedCandidates =
          savedCandidatesResponse.data?.savedCandidates || [];

        setPostedJobsCount(jobs.length);

        setWishlistCount(savedCandidates.length);

      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(
          "Failed to load dashboard stats:",
          error.response?.data || error.message
        );
      }
    };

    loadStats();
    return () => controller.abort();
  }, [token]);

  const stats = [
    {
      icon: Briefcase,
      label: "Posted Jobs",
      value: String(postedJobsCount),
      color: "bg-blue-600",
    },
    {
      icon: FileText,
      label: "Internal Applications",
      value: summaryValue("totalApplications"),
      color: "bg-red-600",
    },
    {
      icon: Gift,
      label: "Internal Reviews",
      value: summaryValue("reviewedApplications"),
      color: "bg-blue-500",
    },
    {
      icon: Bookmark,
      label: "Wishlist",
      value: String(wishlistCount),
      color: "bg-yellow-500",
    },
    { icon: Users, label: "External Talents", value: summaryValue("externalTalents"), color: "bg-blue-600" },
    { icon: MousePointerClick, label: "External clicks", value: summaryValue("externalClicks"), color: "bg-blue-500" },
  ];

  const [chart, setChart] = useState({ period: null, loading: true, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    setChart({ period: chartPeriod, loading: true, data: null, error: false });
    async function loadChart() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/profiles/employer/${encodeURIComponent(employerId)}/views/summary`, {
          params: { period: chartPeriod }, signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!controller.signal.aborted) setChart({ period: chartPeriod, loading: false, data, error: false });
      } catch {
        if (!controller.signal.aborted) setChart({ period: chartPeriod, loading: false, data: null, error: true });
      }
    }
    loadChart();
    return () => controller.abort();
  }, [chartPeriod, employerId, token]);
  const chartLoading = chart.loading || chart.period !== chartPeriod;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2A2A2E] border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].payload.name}</p>
          <p className="text-blue-400 text-sm">Views: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                  <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {summary.error && <p role="status" className="mb-4 text-sm text-gray-400">Unable to refresh application figures. Retrying automatically.</p>}

      {/* Chart */}
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-white">
            Your Profile Views
          </h2>
          <div className="flex gap-2">
            {["day", "week", "month", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  chartPeriod === period
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {chartLoading ? <div className="h-[300px] flex items-center justify-center text-gray-400" role="status">Loading profile views…</div>
          : chart.error ? <div className="h-[300px] flex items-center justify-center text-red-400" role="alert">Unable to load profile views. Select a period to try again.</div>
          : chart.data.total === 0 ? <div className="h-[300px] flex items-center justify-center text-gray-400">No profile views in this period.</div>
          : <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chart.data.buckets}>
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#ffffff05" }}
            />
            <Bar
              dataKey="views"
              fill="#2563eb"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>}
      </div>

      {/* Recent Applicants */}
      <RecentApplication pageSize={6} onApplicationChange={refreshApplicationSummary} />
    </div>
  );
};

export default Dashboard;
