import React, { useState } from "react";
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
import RecentApplication from "./RecentApplication"

export const TalentDashboard = () => {
  const { user } = useAuth();
  const [chartPeriod, setChartPeriod] = useState("month");

  const stats = [
    {
      icon: FileText,
      label: "Applications Sent",
      value: "24",
      color: "bg-blue-600",
    },
    {
      icon: Eye,
      label: "Profile Views",
      value: "1,248",
      color: "bg-green-600",
    },
    { icon: Heart, label: "Saved Jobs", value: "12", color: "bg-red-500" },
    { icon: Briefcase, label: "Interview Invites", value: "5", color: "bg-yellow-500" },
  ];

  // Chart data based on period
  const getChartData = () => {
    const monthData = [
      { name: "Jan", views: 320 },
      { name: "Feb", views: 280 },
      { name: "Mar", views: 440 },
      { name: "Apr", views: 370 },
      { name: "May", views: 520 },
      { name: "Jun", views: 490 },
      { name: "Jul", views: 580 },
      { name: "Aug", views: 620 },
      { name: "Sep", views: 550 },
      { name: "Oct", views: 610 },
      { name: "Nov", views: 680 },
      { name: "Dec", views: 720 },
    ];

    const weekData = [
      { name: "Mon", views: 95 },
      { name: "Tue", views: 120 },
      { name: "Wed", views: 150 },
      { name: "Thu", views: 110 },
      { name: "Fri", views: 170 },
      { name: "Sat", views: 60 },
      { name: "Sun", views: 55 },
    ];

    const dayData = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      views: Math.floor(Math.random() * 40) + 5,
    }));

    const yearData = [
      { name: "2020", views: 3200 },
      { name: "2021", views: 4100 },
      { name: "2022", views: 5300 },
      { name: "2023", views: 6500 },
      { name: "2024", views: 7200 },
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff05" }} />
              <Bar
                dataKey="views"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

       
      </div>

      {/* Job Applied Recently */}
      <RecentApplication />
    </div>
  );
};

export default TalentDashboard;