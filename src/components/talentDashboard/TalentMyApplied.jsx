import React, { useState } from "react";
import { Search, MapPin, Briefcase, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockApplications = [
  {
    id: 1,
    title: "UI UX Designer",
    location: "Las Vegas, NV 89107, USA",
    category: "Design & Creative",
    status: "Seen",
    statusColor: "text-blue-500",
    dateApplied: "December 18, 2023",
  },
  {
    id: 2,
    title: "Human Resource",
    location: "Las Vegas, NV 89107, USA",
    category: "Advertesting",
    status: "Responded",
    statusColor: "text-blue-500",
    dateApplied: "December 18, 2023",
  },
  {
    id: 3,
    title: "Python Developer",
    location: "Las Vegas, NV 89107, USA",
    category: "IT & development",
    status: "Pending",
    statusColor: "text-yellow-500",
    dateApplied: "December 18, 2023",
  },
  {
    id: 4,
    title: "PHP Developer",
    location: "Las Vegas, NV 89107, USA",
    category: "Delivery Driver",
    status: "Pending",
    statusColor: "text-yellow-500",
    dateApplied: "December 18, 2023",
  },
  {
    id: 5,
    title: "Project Manager",
    location: "Las Vegas, NV 89107, USA",
    category: "Sales & Marketing",
    status: "Pending",
    statusColor: "text-yellow-500",
    dateApplied: "December 18, 2023",
  },
  {
    id: 6,
    title: "Developer",
    location: "Las Vegas, NV 89107, USA",
    category: "Engineering",
    status: "Responded",
    statusColor: "text-blue-500",
    dateApplied: "December 18, 2023",
  },
];

export const TalentMyApplied = () => {
  const [applications, setApplications] = useState(mockApplications);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");

  // Filter applications based on search query
  const filteredApplications = applications.filter((app) => {
    const query = searchQuery.toLowerCase();
    return (
      app.title.toLowerCase().includes(query) ||
      app.location.toLowerCase().includes(query) ||
      app.category.toLowerCase().includes(query) ||
      app.status.toLowerCase().includes(query)
    );
  });

  // Sort applications based on selected sort option
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortBy) {
      case "Date Applied":
        return new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime();
      case "Status":
        return a.status.localeCompare(b.status);
      case "Title A-Z":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Handle remove job
  const handleRemoveJob = (id) => {
    setApplications(applications.filter((app) => app.id !== id));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          My Applied
        </h1>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, location, category, or status"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 md:w-auto"
        >
          <option>(Default)</option>
          <option>Date Applied</option>
          <option>Status</option>
          <option>Title A-Z</option>
        </select>
      </div>

      {/* Table Header */}
      <div className="bg-[#1A1A1E] rounded-t-lg border border-white/5 px-6 py-4">
        <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 uppercase">
          <div className="col-span-5">JOBS</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-3">DATE APPLIED</div>
          <div className="col-span-2 text-right">ACTION</div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-[#1A1A1E] rounded-b-lg border border-t-0 border-white/5">
        {sortedApplications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400">No applications found</p>
          </div>
        ) : (
          sortedApplications.map((application, index) => (
            <div
              key={application.id}
              className={`px-6 py-5 ${
                index !== sortedApplications.length - 1
                  ? "border-b border-white/5"
                  : ""
              } hover:bg-white/5 transition-colors`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Job Info */}
                <div className="col-span-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-400 rounded-lg flex-shrink-0"></div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold mb-1">
                      {application.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{application.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{application.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`font-medium ${application.statusColor}`}>
                    {application.status}
                  </span>
                </div>

                {/* Date Applied */}
                <div className="col-span-3">
                  <span className="text-gray-400">{application.dateApplied}</span>
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#2A2A2E] border-white/10"
                    >
                      <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer">
                        View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleRemoveJob(application.id)}
                        className="text-red-400 hover:bg-white/10 cursor-pointer"
                      >
                        Remove Job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TalentMyApplied;