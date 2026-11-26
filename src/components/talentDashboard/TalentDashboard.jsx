import TalentPortfolioAnalytics from "./portfolio/TalentPortfolioAnalytics";
import TalentPortfolioAppearance from "./portfolio/appearance/TalentPortfolioAppearance";
import React from "react";
import { Routes, Route } from "react-router-dom";

import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  Bookmark,
  Bell,
  MessageSquare,
  Users,
  Video,
  Lock,
  Trash2,
  LogOut,
  LifeBuoy,
  Package,
  Search,
  Globe,
  Settings2,
  Inbox,
  BarChart3
} from "lucide-react";
import Meeting from "./TalentMeeting";
import ChangePassword from "../employerDashboard/ChangePassword";
import DeleteProfile from "../employerDashboard/DeleteProfile";
import DashboardLayout from "../employerDashboard/DashboardLayout";
import TalentProfileOverview from "./TalentProfileOverview";
import TalentResumes from "./TalentResume";
import TalentAbout from "./TalentAbout";
import TalentSavedJobs from "./TalentSavedJobs";
import TalentFollowingEmployers from "./FollowingEmployers";
import Messages from "../employerDashboard/Messages";
import TalentMyApplied from "./TalentMyApplied";
import TalentDashboardOverview from "./TalentDashboardOverview";
import { TalentJobs } from "./TalentJobs";
import { TalentJobDetails } from "./TalentJobDetails";
import UserSupport from "../support/UserSupport";
import UserProfileView from "../profiles/UserProfileView";
import ProfileViewHistory from "../profiles/ProfileViewHistory";
import TalentPackages from "./TalentPackages";
import TalentMyPlan from "./TalentMyPlan";
import ExploreJobs from "./ExploreJobs";
import TalentCustomDomain from "./TalentCustomDomain";
import TalentPortfolioEngagement from "./TalentPortfolioEngagement";
import TalentEnquiries from "./TalentEnquiries";


const menuItems = [
  {
    group: "Overview",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/talent-dashboard",
      },
    ],
  },
  {
    group: "My Portfolio",
    items: [
      {
        icon: User,
        label: "Profile",
        path: "/talent-dashboard/profile",
      },
      {
        icon: User,
        label: "Portfolio Appearance",
        path: "/talent-dashboard/portfolio-appearance",
      },
      {
        icon: Settings2,
        label: "Portfolio Engagement",
        path: "/talent-dashboard/portfolio-engagement",
      },
      {
        icon: Inbox,
        label: "Talent Enquiries",
        path: "/talent-dashboard/enquiries",
      },
      {
        icon: BarChart3,
        label: "Portfolio Analytics",
        path: "/talent-dashboard/portfolio-analytics",
      },
      {
        icon: Users,
        label: "Profile Views",
        path: "/talent-dashboard/profile-views",
      },
      {
        icon: FileText,
        label: "Resumes",
        path: "/talent-dashboard/resumes",
      },
      {
        icon: Globe,
        label: "Custom Domain",
        path: "/talent-dashboard/custom-domain",
      },
    ],
  },
  {
    group: "Find Opportunities",
    items: [
      {
        icon: Search,
        label: "Explore Jobs",
        path: "/talent-dashboard/explore",
      },
      {
        icon: Briefcase,
        label: "My Applied",
        path: "/talent-dashboard/my-applied",
      },
      {
        icon: Bookmark,
        label: "Saved Jobs",
        path: "/talent-dashboard/saved-jobs",
      },
      {
        icon: Users,
        label: "Following Employers",
        path: "/talent-dashboard/following-employers",
      },
    ],
  },
  {
    group: "Communication",
    items: [
      {
        icon: MessageSquare,
        label: "Messages",
        path: "/talent-dashboard/messages",
      },
      {
        icon: Video,
        label: "Meetings",
        path: "/talent-dashboard/meeting",
      },
    ],
  },
  {
    group: "Account & Billing",
    items: [
      {
        icon: Package,
        label: "My Packages",
        path: "/talent-dashboard/my-plan",
      },
    ],
  },
  {
    group: "Help & Settings",
    items: [
      {
        icon: LifeBuoy,
        label: "Support",
        path: "/talent-dashboard/support",
      },
      {
        icon: Lock,
        label: "Change Password",
        path: "/talent-dashboard/change-passwords",
      },
      {
        icon: Trash2,
        label: "Delete Profile",
        path: "/talent-dashboard/delete-profile",
      },
      {
        icon: LogOut,
        label: "Log Out",
        path: "/signin",
      },
    ],
  },
];


export const TalentDashboard = () => {
  return (
    <DashboardLayout menuItems={menuItems} userType="talent">
      <Routes>
        <Route index element={<TalentDashboardOverview />} />
        <Route path="portfolio-analytics" element={<TalentPortfolioAnalytics />} />
        <Route path="portfolio-appearance" element={<TalentPortfolioAppearance />} />
        <Route path="users/:userType/:userId" element={<UserProfileView />} />
        <Route path="profile-views" element={<ProfileViewHistory />} />
        <Route path="profile" element={<TalentProfileOverview />} />
        <Route path="resumes" element={<TalentResumes />} />
        <Route path="about" element={<TalentAbout />} />
        <Route path="my-applied" element={<TalentMyApplied />} />
        <Route path="saved-jobs" element={<TalentSavedJobs />} />
        <Route path="messages" element={<Messages />} />
        <Route
          path="following-employers"
          element={<TalentFollowingEmployers />}
        />
        <Route path="meeting" element={<Meeting />} />
        <Route path="support" element={<UserSupport />} />
        <Route path="change-passwords" element={<ChangePassword />} />
        <Route path="delete-profile" element={<DeleteProfile />} />
        <Route path="job-results" element={<TalentJobs />} />
        <Route path="job-results/details/:id" element={<TalentJobDetails />} />
        <Route path="packages" element={<TalentPackages />} />
        <Route path="my-plan" element={<TalentMyPlan />} />
        <Route path="explore" element={<ExploreJobs />}/>
        <Route path="custom-domain" element={<TalentCustomDomain />} />
        <Route
          path="portfolio-engagement"
          element={<TalentPortfolioEngagement />}
        />
        <Route
          path="enquiries"
          element={<TalentEnquiries />}
        />
      </Routes>
    </DashboardLayout>
  );
};

export default TalentDashboard;
