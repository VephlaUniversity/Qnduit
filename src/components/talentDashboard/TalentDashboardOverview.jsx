import React, { useState, useEffect } from "react";
import {
  Briefcase,
  FileText,
  Heart,
  Eye,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
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

export const TalentDashboard = () => {
  const { user } = useAuth();
  const [chartPeriod, setChartPeriod] = useState("month");
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chart, setChart] = useState({
    period: null,
    loading: true,
    data: null,
    error: false,
  });
  const [chartReload, setChartReload] = useState(0);

  const stats = [
    {
      icon: FileText,
      label: "Applications Sent",
      value: statsLoading ? "…" : applications.length,
      color: "bg-blue-600",
    },
    {
      icon: Eye,
      label: `Profile Views (${chartPeriod})`,
      value:
        chart.loading || chart.period !== chartPeriod
          ? "…"
          : chart.error
            ? "–"
            : (chart.data?.total ?? 0).toLocaleString(),
      color: "bg-green-600",
    },
    {
      icon: Heart,
      label: "Saved Jobs",
      value: statsLoading ? "…" : savedJobs.length,
      color: "bg-red-500",
    },
    {
      icon: Briefcase,
      label: "Interview Invites",
      value: statsLoading ? "…" : meetings.length,
      color: "bg-yellow-500",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setStatsLoading(false);
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [applicationsRes, savedJobsRes, meetingsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/applications/my-applications`, {
            headers,
          }),

          axios.get(`${API_BASE_URL}/api/saved-jobs`, { headers }),

          axios.get(`${API_BASE_URL}/api/meetings/talent-meetings`, {
            headers,
          }),
        ]);

        setApplications(applicationsRes.data.applications || []);
        setSavedJobs(savedJobsRes.data.jobs || []);
        setMeetings(meetingsRes.data.meetings || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Real profile-view counts from the API (UTC buckets, self-views excluded)
  const userId = user?.id || user?._id;
  useEffect(() => {
    const controller = new AbortController();
    setChart({ period: chartPeriod, loading: true, data: null, error: false });
    const loadChart = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!userId || !token) throw new Error("Not signed in");
        const { data } = await axios.get(
          `${API_BASE_URL}/api/profiles/talent/${encodeURIComponent(userId)}/views/summary`,
          {
            params: { period: chartPeriod },
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!Array.isArray(data.buckets)) throw new Error("Bad response");
        if (!controller.signal.aborted)
          setChart({ period: chartPeriod, loading: false, data, error: false });
      } catch {
        if (!controller.signal.aborted)
          setChart({ period: chartPeriod, loading: false, data: null, error: true });
      }
    };
    loadChart();
    return () => controller.abort();
  }, [chartPeriod, userId, chartReload]);
  const chartLoading = chart.loading || chart.period !== chartPeriod;

  // Custom tooltip component
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Talent Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
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
                  <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Profile Views Chart with Recharts */}
        <div className="lg:col-span-2 bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-semibold text-white">
              Your Profile Views
            </h2>
            <div className="flex gap-2">
              {["day", "week", "month", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  aria-pressed={chartPeriod === period}
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
          {chartLoading ? (
            <div
              className="h-[300px] flex items-center justify-center gap-3 text-gray-400"
              role="status"
            >
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading profile views…
            </div>
          ) : chart.error ? (
            <div
              className="h-[300px] flex flex-col items-center justify-center gap-3 text-red-400"
              role="alert"
            >
              Unable to load profile views.
              <button
                onClick={() => setChartReload((value) => value + 1)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : chart.data.total === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No profile views in this period.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
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
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Job Applied Recently */}
      <RecentApplication pageSize={6} />
    </div>
  );
};

export default TalentDashboard;
