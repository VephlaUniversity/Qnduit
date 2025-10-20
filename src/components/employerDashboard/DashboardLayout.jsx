import React, { useState } from "react";
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
  Bell,
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
} from "lucide-react";

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

  // Default employer menu items if not provided
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
    { icon: Bell, label: "Candidate Alerts", path: "/dashboard/alerts" },
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
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-[#0E0E10]">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#1A1A1E] border-b border-white/10 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left section */}
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

          {/* Right section */}
          <div className="flex items-center gap-3">
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
            <button className="hidden md:block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Upload Resume
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-[#1A1A1E] border-r border-white/10 transition-transform duration-300 ease-in-out z-40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 w-64 overflow-y-auto`}
        >
          <nav className="p-4 space-y-1">
            {defaultMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              // Handle logout separately if it's in the menu items
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

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden top-16"
            onClick={toggleSidebar}
          ></div>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
