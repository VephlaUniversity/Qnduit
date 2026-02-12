import React, { useState, useEffect } from "react";
import { Briefcase, FileText, Gift, Bookmark } from "lucide-react";
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

const Dashboard = () => {
  const [chartPeriod, setChartPeriod] = useState("month");
  const [postedJobsCount, setPostedJobsCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Load dynamic stats from localStorage
  useEffect(() => {
    const loadStats = () => {
      // Get posted jobs count
      const postedJobs = JSON.parse(localStorage.getItem("postedJobs") || "[]");
      setPostedJobsCount(postedJobs.length);

      // Get applications (from Recent Applications - you can adjust this based on your data structure)
      const applications = JSON.parse(
        localStorage.getItem("applications") || "[]",
      );
      setApplicationsCount(applications.length);

      // Get review count (applicants with "Seen" status)
      const reviewApplicants = applications.filter(
        (app) => app.status === "Seen",
      );
      setReviewCount(reviewApplicants.length);

      // Get wishlist count (saved candidates)
      const savedCandidates = JSON.parse(
        localStorage.getItem("savedCandidates") || "[]",
      );
      setWishlistCount(savedCandidates.length);
    };

    loadStats();

    // Listen for updates
    const handleStorageUpdate = () => {
      loadStats();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("savedCandidatesUpdated", handleStorageUpdate);
    window.addEventListener("postedJobsUpdated", handleStorageUpdate);
    window.addEventListener("applicationsUpdated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("savedCandidatesUpdated", handleStorageUpdate);
      window.removeEventListener("postedJobsUpdated", handleStorageUpdate);
      window.removeEventListener("applicationsUpdated", handleStorageUpdate);
    };
  }, []);

  const stats = [
    {
      icon: Briefcase,
      label: "Posted Jobs",
      value: String(postedJobsCount),
      color: "bg-blue-600",
    },
    {
      icon: FileText,
      label: "Application",
      value: String(applicationsCount),
      color: "bg-red-600",
    },
    {
      icon: Gift,
      label: "Review",
      value: String(reviewCount),
      color: "bg-blue-500",
    },
    {
      icon: Bookmark,
      label: "Wishlist",
      value: String(wishlistCount),
      color: "bg-yellow-500",
    },
  ];

  const getChartData = () => {
    const monthData = [
      { name: "Jan", views: 420 },
      { name: "Feb", views: 380 },
      { name: "Mar", views: 540 },
      { name: "Apr", views: 470 },
      { name: "May", views: 620 },
      { name: "Jun", views: 590 },
      { name: "Jul", views: 680 },
      { name: "Aug", views: 720 },
      { name: "Sep", views: 650 },
      { name: "Oct", views: 710 },
      { name: "Nov", views: 780 },
      { name: "Dec", views: 820 },
    ];
    const weekData = [
      { name: "Mon", views: 120 },
      { name: "Tue", views: 150 },
      { name: "Wed", views: 180 },
      { name: "Thu", views: 140 },
      { name: "Fri", views: 200 },
      { name: "Sat", views: 90 },
      { name: "Sun", views: 85 },
    ];
    const dayData = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      views: Math.floor(Math.random() * 50) + 10,
    }));
    const yearData = [
      { name: "2020", views: 5200 },
      { name: "2021", views: 6100 },
      { name: "2022", views: 7300 },
      { name: "2023", views: 8500 },
      { name: "2024", views: 9200 },
    ];
    switch (chartPeriod) {
      case "day":
        return dayData;
      case "week":
        return weekData;
      case "year":
        return yearData;
      default:
        return monthData;
    }
  };

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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getChartData()}>
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
      </div>

      {/* Recent Applicants */}
      <RecentApplication />
    </div>
  );
};

export default Dashboard;
