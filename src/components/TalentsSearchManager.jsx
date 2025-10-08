import { useEffect, useState } from "react";
import { ResultsPage } from "./pages/Result";
import { ProfilePage } from "./pages/ProfilePage";
import { useSearchParams } from "react-router-dom";

export const TalentsSearchManager = () => {
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState("results");
  const [searchData, setSearchData] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    const jobTitle = searchParams.get("jobTitle");
    const location = searchParams.get("location");
    const workType = searchParams.get("workType");

    if (jobTitle || location || workType) {
      setSearchData({ jobTitle, location, workType });
      setCurrentPage("results");
    }
  }, [searchParams]);

  const handleViewProfile = (candidate) => {
    setSelectedCandidate(candidate);
    setCurrentPage("profile");
  };

  const handleBackToResults = () => {
    setCurrentPage("results");
  };

  return (
    <div className="min-h-screen bg-[#0F1419]">
      {currentPage === "results" && (
        <ResultsPage
          searchParams={searchData}
          onViewProfile={handleViewProfile}
        />
      )}

      {currentPage === "profile" && selectedCandidate && (
        <ProfilePage
          candidate={selectedCandidate}
          onBack={handleBackToResults}
        />
      )}
    </div>
  );
};
