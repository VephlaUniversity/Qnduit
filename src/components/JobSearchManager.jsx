import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { JobOpportunities } from "./pages/JobOpportinities";
import { JobDetails } from "./pages/JobDetails";

export const JobManager = () => {
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState("opportunities");
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    const jobTitle = searchParams.get("jobTitle");
    const location = searchParams.get("location");
    const workType = searchParams.get("workType");

    if (jobTitle || location || workType) {
      setCurrentPage("opportunities");
    }
  }, [searchParams]);

  const handleViewJob = (jobId) => {
    setSelectedJobId(jobId);
    setCurrentPage("details");
  };

  const handleBackToOpportunities = () => {
    setCurrentPage("opportunities");
    setSelectedJobId(null);
  };

  return (
    <div className="min-h-screen bg-[#0F1419]">
      {currentPage === "opportunities" && (
        <JobOpportunities onViewJob={handleViewJob} />
      )}

      {currentPage === "details" && selectedJobId && (
        <JobDetails jobId={selectedJobId} onBack={handleBackToOpportunities} />
      )}
    </div>
  );
};
