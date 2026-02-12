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

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/talent-dashboard" },
  { icon: User, label: "Profile", path: "/talent-dashboard/profile" },
  { icon: FileText, label: "Resumes", path: "/talent-dashboard/resumes" },

  {
    icon: Briefcase,
    label: "My Applied",
    path: "/talent-dashboard/my-applied",
  },
  { icon: Bookmark, label: "Saved Jobs", path: "/talent-dashboard/saved-jobs" },
  {
    icon: MessageSquare,
    label: "Messages",
    path: "/talent-dashboard/messages",
  },
  {
    icon: Users,
    label: "Following Employers",
    path: "/talent-dashboard/following-employers",
  },
  { icon: Video, label: "Meeting", path: "/talent-dashboard/meeting" },
  {
    icon: Lock,
    label: "Change Passwords",
    path: "/talent-dashboard/change-passwords",
  },
  {
    icon: Trash2,
    label: "Delete Profile",
    path: "/talent-dashboard/delete-profile",
  },
  { icon: LogOut, label: "Log Out", path: "/signin" },
];

export const TalentDashboard = () => {
  return (
    <DashboardLayout menuItems={menuItems} userType="talent">
      <Routes>
        <Route index element={<TalentDashboardOverview />} />
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
        <Route path="change-passwords" element={<ChangePassword />} />
        <Route path="delete-profile" element={<DeleteProfile />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TalentDashboard;
