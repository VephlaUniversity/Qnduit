import TalentsResultsPage from "./TalentResultsPage";
import TalentProfile from "./TalentProfile";
import { candidatesData } from "../../data/talentsData";
import { useSearchParams, useNavigate } from "react-router-dom";

export const TalentResultsWrapper = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const jobTitle = searchParams.get("jobTitle") || "";
  const candidateId = searchParams.get("candidateId") || "";

  // Match by id
  const candidate = candidateId
    ? candidatesData.find((c) => c.id === parseInt(candidateId))
    : null;

  const handleViewProfile = (candidate) => {
    navigate(
      `/dashboard/talent-results/profile?candidateId=${candidate.id}&jobTitle=${encodeURIComponent(jobTitle)}`,
    );
  };

  const handleBack = () => {
    navigate(
      `/dashboard/talent-results?jobTitle=${encodeURIComponent(jobTitle)}`,
    );
  };

  if (candidate) {
    return <TalentProfile candidate={candidate} onBack={handleBack} />;
  }

  return (
    <TalentsResultsPage
      searchParams={{ jobTitle }}
      onViewProfile={handleViewProfile}
    />
  );
};
