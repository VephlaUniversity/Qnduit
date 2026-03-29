import React, { useEffect, useState } from "react";
import { MapPin, Clock } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const RecentApplication = () => {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE_URL}/api/applications/my-applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const formatted = res.data.applications.map((app) => ({
          id: app._id,
          title: app.jobId?.jobTitle || "Unknown Role",
          location: app.jobId?.location || "N/A",
          category: app.jobId?.category || "General",
          status: mapStatus(app.status),
          statusColor: getStatusColor(mapStatus(app.status)),
          dateApplied: new Date(app.createdAt).toLocaleDateString(),
        }));

        setApplications(formatted);
      } catch (error) {
        console.error("Failed to fetch applications", error);
      }
    };

    fetchApplications();
  }, []);

  const mapStatus = (status) => {
    switch (status) {
      case "reviewed":
      case "shortlisted":
      case "hired":
        return "Responded";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Responded":
        return "bg-green-600/20 text-green-400";
      case "Pending":
        return "bg-yellow-600/20 text-yellow-400";
      case "Rejected":
        return "bg-red-600/20 text-red-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  return (
       <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <h2 className="text-xl font-semibold text-white mb-6">
          Job Applied Recently
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  JOBS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  STATUS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  DATE APPLIED
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-600 flex-shrink-0"></div>
                      <div>
                        <p className="text-white font-semibold text-base mb-1">
                          {application.title}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {app.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {app.timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-300 text-base">
                    {application.dateApplied}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
};

export default RecentApplication;