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
import { ForgotPassword } from "./components/auth/ForgotPasswprd";
import { Payment } from "./components/auth/Payment";

const App = () => {
  const location = useLocation();
  const isAuthPage = [
    "/talent-signup",
    "/employer-signup",
    "/signin",
    "/forgot-password",
    "/payment",
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
          <Route path="/testimonials" element={<FeaturedSuccessStories />} />
          <Route path="/find-talents" element={<TalentsSearchManager />} />
          <Route path="/jobs" element={<JobManager />} />
          {/* SignIn/SignUp */}
          <Route path="/talent-signup" element={<TalentSignup />} />
          <Route path="/employer-signup" element={<EmployerSignup />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment" element={<Payment />} />
        </Routes>
      </AnimatePresence>
      {!isAuthPage && <Footer />}
    </div>
  );
};
export default App;
