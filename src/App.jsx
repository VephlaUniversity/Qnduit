import { Header } from "./components/Header";
import { QnduitLanding } from "./components/pages/QnduitLanding";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";

import { ForTalents } from "./components/pages/ForTalents";
import { ForEmployers } from "./components/pages/ForEmployers";
import { Route, Routes, useLocation } from "react-router-dom";
import { PrincinPage } from "./components/pages/PrincinPage";
import FeaturedSuccessStories from "./components/pages/FeaturedSuccessStories";

import { TalentsSearchManager } from "./components/TalentsSearchManager";
import { JobManager } from "./components/JobSearchManager";
import { AnimatePresence } from "framer-motion";
import { TalentSignup } from "./components/auth/TalentSignUp";
import { EmployerSignup } from "./components/auth/EmployerSignUp";
import { SignIn } from "./components/auth/SignIn";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { Payment } from "./components/auth/Payment";
import DashboardLayout from "./components/employerDashboard/DashboardLayout";
import DeleteProfile from "./components/employerDashboard/DeleteProfile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ChangePassword from "./components/employerDashboard/ChangePassword";
import Meeting from "./components/employerDashboard/Meeting";
import Messages from "./components/employerDashboard/Messages";
import MyPackages from "./components/employerDashboard/MyPackages";

import SavedCandidates from "./components/employerDashboard/SavedCandidates";
import ApplicantsJobs from "./components/employerDashboard/ApplicantJobs";
import SubmitJob from "./components/employerDashboard/SubmitJob";
import MyJob from "./components/employerDashboard/MyJob";
import ProfileSettings from "./components/employerDashboard/ProfileSettings";
import EmployerProfile from "./components/employerDashboard/EmployerProfile";
import Dashboard from "./components/employerDashboard/Dashboard";
import { AuthProvider } from "./components/context/AuthContext";
import TalentDashboard from "./components/talentDashboard/TalentDashboard";
import Contact from "./components/pages/Contact";
import { Toaster } from "./components/ui/toaster";
import About from "./components/pages/About";
import TermsOfService from "./components/pages/TermsOfService";
import PrivacyPolicy from "./components/pages/PrivacyPolicy";
import Blog from "./components/pages/Blog";
import BlogDetail from "./components/BlogDetails";

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = [
    "/talent-signup",
    "/employer-signup",
    "/signin",
    "/forgot-password",
    "/payment",
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/profile-settings",
    "/dashboard/my-job",
    "/dashboard/submit-job",
    "/dashboard/applicants",
    "/dashboard/saved-candidates",
    "/dashboard/alerts",
    "/dashboard/packages",
    "/dashboard/messages",
    "/dashboard/meeting",
    "/dashboard/change-password",
    "/dashboard/delete-profile",
    "/talent-dashboard",
    "/talent-dashboard/profile",
    "/talent-dashboard/resumes",
    "/talent-dashboard/about",
    "/talent-dashboard/my-applied",
    "/talent-dashboard/saved-jobs",

    "/talent-dashboard/messages",
    "/talent-dashboard/following-employers",
    "/talent-dashboard/meeting",
    "/talent-dashboard/change-passwords",
    "/talent-dashboard/delete-profile",
  ].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <ScrollToTop />
      {!isAuthPage && <Header />}
      <AnimatePresence mode="wait">
        <Routes key={location.pathname} location={location}>
          <Route path="/" element={<QnduitLanding />} />
          <Route path="/talents" element={<ForTalents />} />
          <Route path="/employers" element={<ForEmployers />} />
          <Route path="/pricing" element={<PrincinPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/testimonials" element={<FeaturedSuccessStories />} />
          <Route path="/find-talents" element={<TalentsSearchManager />} />
          <Route path="/jobs" element={<JobManager />} />
          {/* SignIn/SignUp */}
          <Route path="/talent-signup" element={<TalentSignup />} />
          <Route path="/employer-signup" element={<EmployerSignup />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment" element={<Payment />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmployerProfile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile-settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfileSettings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/my-job"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyJob />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/submit-job"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SubmitJob />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/applicants"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ApplicantsJobs />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/saved-candidates"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SavedCandidates />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/packages"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyPackages />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Messages />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/meeting"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Meeting />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/change-password"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChangePassword />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/delete-profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DeleteProfile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Talent Dashboard Routes */}
          <Route
            path="/talent-dashboard/*"
            element={
              <ProtectedRoute>
                <TalentDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
      {!isAuthPage && <Footer />}
      <Toaster />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
