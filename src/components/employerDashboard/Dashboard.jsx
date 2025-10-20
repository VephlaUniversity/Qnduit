import React, { useState } from "react";
import {
  Briefcase,
  FileText,
  Gift,
  Bookmark,
  Plus,
  Check,
  RefreshCw,
  Download,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export const Dashboard = () => {
  const { user } = useAuth();
  const [chartPeriod, setChartPeriod] = useState("month");

  const stats = [
    {
      icon: Briefcase,
      label: "Posted Jobs",
      value: "15",
      color: "bg-blue-600",
    },
    {
      icon: FileText,
      label: "Application",
      value: "2068",
      color: "bg-red-600",
    },
    { icon: Gift, label: "Review", value: "21", color: "bg-blue-500" },
    { icon: Bookmark, label: "Wishlist", value: "320", color: "bg-yellow-500" },
  ];

  // Use user notifications or fallback to default
  const notifications = user?.notifications || [
    {
      name: "Cooper",
      action: "applied for a job",
      job: "UI Designer",
      time: "2 hours ago",
    },
    {
      name: "Simmons",
      action: "get a job",
      job: "UX Architect",
      time: "5 hours ago",
    },
    {
      name: "Richards",
      action: "get a job",
      job: "Internet Security",
      time: "1 day ago",
    },
  ];

  const applicants = [
    {
      name: "Arlene McCoy",
      role: "Computational Wizard",
      availability: "Available now",
      location: "Tokyo, Japan",
      status: "Approved",
      date: "December 18, 2023",
    },
    {
      name: "Mrs Dianne Russell",
      role: "Computational Wizard",
      availability: "Available now",
      location: "Tokyo, Japan",
      status: "Approved",
      date: "December 18, 2023",
    },
    {
      name: "Mr Guy Hawkins",
      role: "Computational Wizard",
      availability: "Available now",
      location: "Tokyo, Japan",
      status: "Pending",
      date: "December 18, 2023",
    },
    {
      name: "Lady Darlene Robertson",
      role: "Computational Wizard",
      availability: "Available now",
      location: "Tokyo, Japan",
      status: "Pending",
      date: "December 18, 2023",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Views Chart */}
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
          <div className="h-64 flex items-end justify-between gap-2">
            {/* Simple bar chart placeholder */}
            {Array.from({ length: 12 }).map((_, i) => {
              const height = Math.random() * 100 + 50;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div
                    className="w-full bg-blue-600 rounded-t hover:bg-blue-500 transition-colors cursor-pointer"
                    style={{ height: `${height}px` }}
                  ></div>
                  <span className="text-xs text-gray-500">
                    {[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ][i] || "Jun"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
          <h2 className="text-xl font-semibold text-white mb-6">
            Notifications
          </h2>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {notifications.map((notif, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400">
                    {notif.title && (
                      <span className="text-white font-medium">
                        {notif.title}:{" "}
                      </span>
                    )}
                    {notif.message || (
                      <>
                        <span className="text-white font-medium">
                          {notif.name}
                        </span>{" "}
                        {notif.action}{" "}
                        <span className="text-blue-500">{notif.job}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applicants */}
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <h2 className="text-xl font-semibold text-white mb-6">
          Recent Applicants
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  CANDIDATES
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  STATUS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  APPLIED DATE
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0"></div>
                      <div>
                        <p className="text-blue-500 text-sm font-medium">
                          {applicant.role}
                        </p>
                        <p className="text-white font-medium">
                          {applicant.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {applicant.availability} • {applicant.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        applicant.status === "Approved"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-yellow-600/20 text-yellow-400"
                      }`}
                    >
                      {applicant.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-400 text-sm">
                    {applicant.date}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
