import React, { useState, useEffect } from "react";
import axios from "axios";
import { profileImageUrl } from "../profiles/profileApi";
import { API_BASE_URL } from "../utils/api";
import { Plus, Check, X, Download, Trash2, Search } from "lucide-react";
import { useToast } from "../hooks/useToast";



const formatAppliedDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
    : "Date unavailable";
};

const RecentApplication = () => {
  const [applicants, setApplicants] = useState([]);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {

        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        if (!user?.id) return;

        const res = await axios.get(
          `${API_BASE_URL}/api/applications/employer`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const formatted = res.data.applications.map((app) => ({
          applicationId: app.id,
          talentId: app.applicant?.id,
          name: app.applicant?.name || "Unknown",
          role: app.job?.title || "Applicant",
          availability: "Available",
          location: app.applicant?.location || "N/A",
          status: app.status || "Pending",
          date: formatAppliedDate(app.appliedAt ?? app.createdAt ?? app.date),
          cvUrl: profileImageUrl(app.resumeUrl ?? app.applicant?.resume),
          resumeSource: app.resumeSource ?? (app.applicant?.resume ? "talent" : null),
        }));

        setApplicants(formatted);

      } catch (error) {
        console.error("Failed to fetch applications", error);
      }
    };

    fetchApplications();
  }, []);

  const addToSavedCandidates = async (applicant) => {
    try {
      setSavingId(applicant.talentId);

      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/api/employers/saved-candidates/${applicant.talentId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Success!",
        description: `${applicant.name} saved successfully`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateStatus = (id, status) => {
    setApplicants((prev) =>
      prev.map((a) => (a.applicationId === id ? { ...a, status } : a)),
    );
    const statusMessages = {
      Approved: "Applicant approved successfully!",
      Rejected: "Applicant rejected",
    };
    if (statusMessages[status]) {
      toast({
        title: "Success!",
        description: statusMessages[status],
      });
    }
  };

  const removeApplicant = (id) => {
    setApplicants((prev) => prev.filter((a) => a.applicationId !== id));
    toast({
      title: "Success!",
      description: "Applicant removed",
    });
  };

  const downloadCV = async (applicant) => {
    if (!applicant.cvUrl) {
      toast({ title: "Résumé unavailable", description: "No valid résumé is available for this application.", variant: "destructive" });
      return;
    }
    let blobUrl;
    try {
      const response = await fetch(applicant.cvUrl, { credentials: "omit" });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      const extension = new URL(applicant.cvUrl).pathname.match(/\.(pdf|docx?)$/i)?.[0]
        || (blob.type === "application/pdf" ? ".pdf" : "");
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${applicant.name.replace(/\s+/g, "_")}_CV${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow the browser to consume the download before releasing its temporary URL.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      toast({ title: "Unable to download résumé", description: "Please try again later.", variant: "destructive" });
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-blue-600/20 text-blue-400";
      case "Rejected":
        return "bg-red-600/20 text-red-400";
      default:
        return "bg-yellow-600/20 text-yellow-400";
    }
  };

  // Filter and search logic
  const filteredApplicants = applicants.filter((applicant) => {
    const matchesSearch =
      applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      applicant.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      applicant.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || applicant.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <h2 className="text-xl font-semibold text-white mb-6">
          Recent Applicants
        </h2>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[50%] lg:w-[40%] pl-10 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 min-w-[150px]"
          >
            <option value="all">Sort By</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
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
              {filteredApplicants.map((applicant) => (
                <tr
                  key={applicant.applicationId}
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
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(applicant.status)}`}
                    >
                      {applicant.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-400 text-sm">
                    {applicant.date}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={savingId === applicant.talentId}
                        onClick={() => addToSavedCandidates(applicant)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Add to Saved Candidates"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(applicant.applicationId, "Approved")}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(applicant.applicationId, "Rejected")}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadCV(applicant)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Download CV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeApplicant(applicant.applicationId)}
                        className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredApplicants.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    {searchQuery || filterStatus !== "all"
                      ? "No applicants found matching your search"
                      : "No applicants"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentApplication;
