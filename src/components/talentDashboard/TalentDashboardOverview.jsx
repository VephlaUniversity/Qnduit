import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Briefcase, FileText, Bookmark, Users } from "lucide-react";

export const TalentDashboardOverview = () => {
  const { user } = useAuth();

  const stats = [
    {
      icon: Briefcase,
      label: "Applications",
      value: "12",
      color: "bg-blue-500",
    },
    { icon: FileText, label: "Resumes", value: "3", color: "bg-green-500" },
    { icon: Bookmark, label: "Saved Jobs", value: "8", color: "bg-purple-500" },
    { icon: Users, label: "Following", value: "5", color: "bg-orange-500" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Welcome back, {user?.name || "User"}!
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#1A1A1E] border border-white/5 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-white">
                  {stat.value}
                </span>
              </div>
              <p className="text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TalentDashboardOverview;
