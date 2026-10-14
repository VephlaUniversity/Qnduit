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
    ? candidatesData.find((c) => String(c.id) === candidateId)
    : null;

  const handleBack = () => {
    navigate(
      `/dashboard/talent-results?jobTitle=${encodeURIComponent(jobTitle)}`,
    );
  };

  if (candidate) {
    return (
      <>
        <p className="p-4 text-sm text-amber-200">Sample profile — demonstration data, not a real QNDUIT user account.</p>
        <TalentProfile candidate={candidate} onBack={handleBack} />
      </>
    );
  }

  return <TalentsResultsPage searchParams={{ jobTitle }} />;
};
