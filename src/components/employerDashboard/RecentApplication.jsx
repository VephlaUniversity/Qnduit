import React, { useState } from "react";
import { Plus, Check, X, Download, Trash2, Search } from "lucide-react";
import { useToast } from "../hooks/useToast";

const initialApplicants = [
  {
    id: 1,
    name: "Arlene McCoy",
    role: "Computational Wizard",
    availability: "Available now",
    location: "Tokyo, Japan",
    status: "Pending",
    date: "December 18, 2023",
    cvUrl: "/placeholder.svg",
  },
  {
    id: 2,
    name: "Mrs Dianne Russell",
    role: "Computational Wizard",
    availability: "Available now",
    location: "Tokyo, Japan",
    status: "Pending",
    date: "December 18, 2023",
    cvUrl: "/placeholder.svg",
  },
  {
    id: 3,
    name: "Mr Guy Hawkins",
    role: "Computational Wizard",
    availability: "Available now",
    location: "Tokyo, Japan",
    status: "Pending",
    date: "December 18, 2023",
    cvUrl: "/placeholder.svg",
  },
  {
    id: 4,
    name: "Lady Darlene Robertson",
    role: "Computational Wizard",
    availability: "Available now",
    location: "Tokyo, Japan",
    status: "Pending",
    date: "December 18, 2023",
    cvUrl: "/placeholder.svg",
  },
];

const RecentApplication = () => {
  const { toast } = useToast();
  const [applicants, setApplicants] = useState(initialApplicants);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const addToSavedCandidates = (applicant) => {
    // Get existing saved candidates from localStorage
    const savedCandidates = JSON.parse(
      localStorage.getItem("savedCandidates") || "[]",
    );

    // Check if candidate is already saved
    const isAlreadySaved = savedCandidates.some((c) => c.id === applicant.id);

    if (isAlreadySaved) {
      toast({
        title: "Already Saved",
        description: `${applicant.name} is already in your saved candidates`,
        variant: "destructive",
      });
      return;
    }

    // Add new candidate to saved list
    const newCandidate = {
      id: applicant.id,
      name: applicant.name,
      role: applicant.role,
      location: applicant.location,
      salary: "$8000/month",
      salaryValue: 8000,
    };

    savedCandidates.push(newCandidate);
    localStorage.setItem("savedCandidates", JSON.stringify(savedCandidates));

    // Trigger custom event for real-time sync across components
    window.dispatchEvent(new Event("savedCandidatesUpdated"));

    toast({
      title: "Success!",
      description: `${applicant.name} has been added to Saved Candidates!`,
    });
  };

  const updateStatus = (id, status) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
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
    setApplicants((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: "Success!",
      description: "Applicant removed",
    });
  };

  const downloadCV = (applicant) => {
    const link = document.createElement("a");
    link.href = applicant.cvUrl || "/placeholder.svg";
    link.download = `${applicant.name.replace(/\s+/g, "_")}_CV.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  key={applicant.id}
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
                        onClick={() => addToSavedCandidates(applicant)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Add to Saved Candidates"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(applicant.id, "Approved")}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(applicant.id, "Rejected")}
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
                        onClick={() => removeApplicant(applicant.id)}
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
