import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { NotificationPop } from "./NotificationPop";
import {
  LayoutDashboard,
  User,
  Briefcase,
  PlusCircle,
  Users,
  Bookmark,
  Package,
  MessageSquare,
  Video,
  Lock,
  Trash2,
  LogOut,
  Menu,
  X,
  HelpCircle,
  BellRing,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react";

// Import shared mock data & search helper
import { mockSearchTalents } from "../../data/talentsData";

//Search config per userType
const SEARCH_CONFIG = {
  talent: {
    endpoint: "/api/jobs",
    queryParam: "q",
    mockType: "jobs",
    labelKey: "jobTitle",
    sublabelKey: "companyName",
    resultsRoute: "/talent-dashboard/job-results",
    searchParamKey: "jobTitle",
    placeholder: "Search jobs...",
  },
  employer: {
    endpoint: "/api/talents",
    queryParam: "q",
    mockType: "talents",
    labelKey: "fullName",
    sublabelKey: "role",
    resultsRoute: "/dashboard/talent-results",
    searchParamKey: "jobTitle",
    placeholder: "Search talents...",
  },
};

export const DashboardLayout = ({
  children,
  menuItems,
  userType = "employer",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle"); // idle | loading | success | error
  const [showDropdown, setShowDropdown] = useState(false);

  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  const config = SEARCH_CONFIG[userType] ?? SEARCH_CONFIG.employer;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchStatus("idle");
      setShowDropdown(false);
      return;
    }

    setSearchStatus("loading");
    setShowDropdown(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        //MOCK MODE
        const results = await mockSearchTalents(trimmed);
        setSearchResults(results);
        setSearchStatus("success");

        // const url = `${config.endpoint}?${config.queryParam}=${encodeURIComponent(trimmed)}`;
        // const res = await fetch(url, {
        //   headers: {
        //     "Content-Type": "application/json",
        //     // Authorization: `Bearer ${token}`,
        //   },
        // });
        // if (!res.ok) throw new Error("Request failed");
        // const data = await res.json();
        // const results = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
        // setSearchResults(results);
        // setSearchStatus("success");
      } catch {
        setSearchStatus("error");
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, config]);

  const handleResultClick = (result) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(
      `${config.resultsRoute}?${config.searchParamKey}=${encodeURIComponent(
        result[config.labelKey] ?? searchQuery,
      )}`,
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowDropdown(false);
      navigate(
        `${config.resultsRoute}?${config.searchParamKey}=${encodeURIComponent(
          searchQuery.trim(),
        )}`,
      );
    }
  };

  const defaultMenuItems = menuItems || [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: User, label: "Profile", path: "/dashboard/profile" },
    { icon: Briefcase, label: "My Job", path: "/dashboard/my-job" },
    { icon: PlusCircle, label: "Submit Job", path: "/dashboard/submit-job" },
    { icon: Users, label: "Applicants Jobs", path: "/dashboard/applicants" },
    {
      icon: Bookmark,
      label: "Saved Candidates",
      path: "/dashboard/saved-candidates",
    },
    { icon: Package, label: "My Packages", path: "/dashboard/packages" },
    { icon: MessageSquare, label: "Messages", path: "/dashboard/messages" },
    { icon: Video, label: "Meeting", path: "/dashboard/meeting" },
    {
      icon: Lock,
      label: "Change Passwords",
      path: "/dashboard/change-password",
    },
    {
      icon: Trash2,
      label: "Delete Profile",
      path: "/dashboard/delete-profile",
    },
    { icon: LogOut, label: "Log Out", path: "/signin" },
  ];

  const handleLogout = async () => await signOut();
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-[#0E0E10]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#1A1A1E] border-b border-white/10 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-white hover:text-blue-400 transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white"
            >
              <img src="/images/dashboard-logo.png" alt="" className="w-5" />
              <span className="text-xl">QNDUIT</span>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* ── Smart Search Bar ── */}
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 bg-[#0E0E10] border border-white/10 rounded-[10px] px-3 py-2 w-20 sm:w-48 md:w-64 focus-within:border-white/25 transition-colors">
                {searchStatus === "loading" ? (
                  <Loader2 className="w-4 h-4 text-gray-500 flex-shrink-0 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <input
                  type="text"
                  placeholder={config.placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim() && searchStatus !== "idle")
                      setShowDropdown(true);
                  }}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
                />
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-[#1A1A1E] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  {searchStatus === "loading" && (
                    <div className="px-4 py-5 flex items-center gap-3 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}

                  {searchStatus === "error" && (
                    <div className="px-4 py-5 text-center">
                      <p className="text-sm text-red-400">
                        Something went wrong. Please try again.
                      </p>
                    </div>
                  )}

                  {searchStatus === "success" && searchResults.length === 0 && (
                    <div className="px-4 py-5 text-center">
                      <p className="text-sm text-gray-500">
                        No results found for{" "}
                        <span className="text-white font-medium">
                          "{searchQuery}"
                        </span>
                      </p>
                    </div>
                  )}

                  {searchStatus === "success" && searchResults.length > 0 && (
                    <ul className="max-h-64 overflow-y-auto divide-y divide-white/5">
                      {searchResults.map((result, index) => (
                        <li key={result.id ?? index}>
                          <button
                            onClick={() => handleResultClick(result)}
                            className="w-full px-4 py-3 flex flex-col items-start hover:bg-white/5 transition-colors text-left"
                          >
                            <span className="text-sm text-white font-medium truncate w-full">
                              {result[config.labelKey] ?? "—"}
                            </span>
                            {config.sublabelKey &&
                              result[config.sublabelKey] && (
                                <span className="text-xs text-gray-500 truncate w-full mt-0.5">
                                  {result[config.sublabelKey]}
                                </span>
                              )}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            navigate(
                              `${config.resultsRoute}?${config.searchParamKey}=${encodeURIComponent(searchQuery.trim())}`,
                            );
                          }}
                          className="w-full px-4 py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-colors text-center font-medium"
                        >
                          View all results for "{searchQuery}"
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button className="hidden sm:flex text-gray-400 hover:text-white transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <NotificationPop>
              <button className="text-gray-400 hover:text-white transition-colors relative">
                <BellRing className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
            </NotificationPop>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span className="hidden sm:block text-sm">
                  {userType === "talent" ? "Talent" : "Employer"}
                </span>
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1E] border border-white/10 rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {userType === "talent" && (
              <button
                className="hidden md:block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                onClick={() => navigate("/talent-dashboard/resumes")}
              >
                Upload Resume
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-[#1A1A1E] border-r border-white/10 transition-transform duration-300 ease-in-out z-40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 w-64 overflow-y-auto`}
        >
          <nav className="p-4 space-y-1">
            {defaultMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (item.label === "Log Out") {
                return (
                  <button
                    key={item.path}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600/10 text-blue-500"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden top-16"
            onClick={toggleSidebar}
          />
        )}

        <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
