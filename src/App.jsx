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

const App = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <ScrollToTop />
      <Header />
      <Routes key={location.pathname} location={location}>
        <Route path="/" element={<QnduitLanding />} />
        <Route path="/talents" element={<ForTalents />} />
        <Route path="/employers" element={<ForEmployers />} />
        <Route path="/pricing" element={<PrincinPage />} />
        <Route path="/testimonials" element={<FeaturedSuccessStories />} />
        <Route path="/find-talents" element={<TalentsSearchManager />} />
        <Route path="/jobs" element={<JobManager />} />
      </Routes>
      <Footer />
    </div>
  );
};
export default App;
