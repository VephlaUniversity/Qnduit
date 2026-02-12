import React, { useState, useEffect } from "react";
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
    name: "Tech Corp",
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
  const [employers, setEmployers] = useState(
    mockEmployers.map(emp => ({ ...emp, isFollowing: true }))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");
  const [removalTimers, setRemovalTimers] = useState({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(removalTimers).forEach(timer => clearTimeout(timer));
    };
  }, [removalTimers]);

  // Filter employers based on search query
  const filteredEmployers = employers.filter((employer) => {
    const query = searchQuery.toLowerCase();
    return (
      employer.name.toLowerCase().includes(query) ||
      employer.location.toLowerCase().includes(query) ||
      employer.category.toLowerCase().includes(query)
    );
  });

  // Sort employers based on selected sort option
  const sortedEmployers = [...filteredEmployers].sort((a, b) => {
    switch (sortBy) {
      case "Name A-Z":
        return a.name.localeCompare(b.name);
      case "Name Z-A":
        return b.name.localeCompare(a.name);
      case "Most Openings":
        return b.openings - a.openings;
      default:
        return 0;
    }
  });

  // Handle follow/unfollow toggle
  const handleFollowToggle = (id) => {
    setEmployers(employers.map(emp => {
      if (emp.id === id) {
        const newFollowingStatus = !emp.isFollowing;
        
        // If unfollowing, set a timer to remove after 30 minutes
        if (!newFollowingStatus) {
          const timer = setTimeout(() => {
            setEmployers(prevEmployers => 
              prevEmployers.filter(e => e.id !== id)
            );
            setRemovalTimers(prev => {
              const newTimers = { ...prev };
              delete newTimers[id];
              return newTimers;
            });
          }, 30 * 60 * 1000); // 30 minutes in milliseconds
          
          setRemovalTimers(prev => ({ ...prev, [id]: timer }));
        } else {
          // If following again, cancel the removal timer
          if (removalTimers[id]) {
            clearTimeout(removalTimers[id]);
            setRemovalTimers(prev => {
              const newTimers = { ...prev };
              delete newTimers[id];
              return newTimers;
            });
          }
        }
        
        return { ...emp, isFollowing: newFollowingStatus };
      }
      return emp;
    }));
  };

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
            placeholder="Search by company name, location, or category"
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
          <option>Name A-Z</option>
          <option>Name Z-A</option>
          <option>Most Openings</option>
        </select>
      </div>

      {/* Employers List */}
      <div className="space-y-4">
        {sortedEmployers.length === 0 ? (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-12 text-center">
            <p className="text-gray-400">No employers found</p>
          </div>
        ) : (
          sortedEmployers.map((employer) => (
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
                    {employer.openings} job opening{employer.openings !== 1 ? 's' : ''}
                  </button>
                  <button 
                    onClick={() => handleFollowToggle(employer.id)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${
                      employer.isFollowing
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    {employer.isFollowing ? "Unfollow" : "Follow"}
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

export default TalentFollowingEmployers;