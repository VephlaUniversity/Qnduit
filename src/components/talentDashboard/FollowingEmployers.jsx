import React, { useState } from "react";
import { Search, MapPin, Briefcase, Star } from "lucide-react";

const mockEmployers = [
  {
    id: 1,
    name: "Samsung",
    logo: null,
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Design & Creative",
    openings: 5,
    verified: true,
  },
  {
    id: 2,
    name: "Movistar",
    logo: null,
    rating: 4,
    location: "Las Vegas, NV 89107, USA",
    category: "Advertesting",
    openings: 4,
    verified: false,
  },
  {
    id: 3,
    name: "",
    logo: null,
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "IT & development",
    openings: 5,
    verified: true,
  },
  {
    id: 4,
    name: "Momba Jai",
    logo: null,
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Delivery Driver",
    openings: 2,
    verified: true,
  },
  {
    id: 5,
    name: "Sarang Hedo",
    logo: null,
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Sales & Marketing",
    openings: 0,
    verified: false,
  },
  {
    id: 6,
    name: "Avitex Agency",
    logo: null,
    rating: 5,
    location: "Las Vegas, NV 89107, USA",
    category: "Engineering",
    openings: 5,
    verified: true,
  },
];

export const TalentFollowingEmployers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Following Employers
        </h1>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
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
          <option>Sort by (Default)</option>
          <option>Name A-Z</option>
          <option>Name Z-A</option>
          <option>Most Openings</option>
        </select>
      </div>

      {/* Employers List */}
      <div className="space-y-4">
        {mockEmployers.map((employer) => (
          <div
            key={employer.id}
            className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {/* Logo */}
                <div className="w-16 h-16 bg-gray-400 rounded-lg flex-shrink-0"></div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Rating Stars */}
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < employer.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "fill-gray-600 text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold text-lg">
                      {employer.name || "Company Name"}
                    </h3>
                    {employer.verified && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{employer.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{employer.category}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm">
                  {employer.openings} job openings
                </button>
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm">
                  Unfollow
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TalentFollowingEmployers;
