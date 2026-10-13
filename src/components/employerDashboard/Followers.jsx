import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Calendar,
  MessageSquare,
} from "lucide-react";

// Mock data for now (same approach as the talent "Following Employers" page).
const mockFollowers = [
  {
    id: 1,
    name: "Arlene McCoy",
    role: "UI UX Designer",
    location: "Tokyo, Japan",
    skills: ["Figma", "Prototyping", "Design Systems"],
    followedOn: "2025-03-12",
    availableNow: true,
  },
  {
    id: 2,
    name: "Guy Hawkins",
    role: "Frontend Developer",
    location: "Lagos, Nigeria",
    skills: ["React", "TypeScript", "Tailwind"],
    followedOn: "2025-03-02",
    availableNow: true,
  },
  {
    id: 3,
    name: "Dianne Russell",
    role: "Cybersecurity Analyst",
    location: "Austin, TX, USA",
    skills: ["SIEM", "Threat Hunting", "Incident Response"],
    followedOn: "2025-02-20",
    availableNow: false,
  },
  {
    id: 4,
    name: "Darlene Robertson",
    role: "Cloud Engineer",
    location: "Berlin, Germany",
    skills: ["AWS", "Terraform", "Kubernetes"],
    followedOn: "2025-02-11",
    availableNow: true,
  },
  {
    id: 5,
    name: "Cameron Williamson",
    role: "Product Manager",
    location: "London, UK",
    skills: ["Roadmapping", "Analytics", "Agile"],
    followedOn: "2025-01-28",
    availableNow: false,
  },
  {
    id: 6,
    name: "Kristin Watson",
    role: "Data Analyst",
    location: "Toronto, Canada",
    skills: ["SQL", "Power BI", "Python"],
    followedOn: "2025-01-15",
    availableNow: true,
  },
  {
    id: 7,
    name: "Jerome Bell",
    role: "DevOps Engineer",
    location: "Accra, Ghana",
    skills: ["CI/CD", "Docker", "Linux"],
    followedOn: "2024-12-30",
    availableNow: true,
  },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export const Followers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = mockFollowers.filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.role.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.skills.some((s) => s.toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.followedOn) - new Date(b.followedOn);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return new Date(b.followedOn) - new Date(a.followedOn);
      }
    });
  }, [search, sortBy]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Followers{" "}
          <span className="text-gray-500 text-xl">
            ({mockFollowers.length})
          </span>
        </h1>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, role, skill or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 md:w-auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Followers list */}
      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-12 text-center">
            <p className="text-gray-400">
              {mockFollowers.length === 0
                ? "No one is following you yet."
                : "No followers match your search."}
            </p>
          </div>
        ) : (
          visible.map((follower) => (
            <div
              key={follower.id}
              className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 hover:border-white/10 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {initials(follower.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-semibold text-lg">
                        {follower.name}
                      </h3>
                      {follower.availableNow && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-500 text-xs">
                          Available now
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{follower.role}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{follower.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Followed {formatDate(follower.followedOn)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {follower.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-md bg-[#2A2A2E] text-gray-300 text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => navigate("/dashboard/messages")}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2E] hover:bg-white/10 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        `/dashboard/talent-results?jobTitle=${encodeURIComponent(follower.role)}`,
                      )
                    }
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Followers;
