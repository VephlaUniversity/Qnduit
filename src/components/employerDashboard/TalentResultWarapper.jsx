import TalentsResultsPage from "./TalentResultsPage";
import { Navigate, useSearchParams } from "react-router-dom";

export const TalentResultsWrapper = () => {
  const [searchParams] = useSearchParams();
  const jobTitle = searchParams.get("jobTitle") || "";
  const candidateId = searchParams.get("candidateId");
  // Preserve the old URL shape, but resolve its real ID through the protected API.
  if (candidateId)
    return (
      <Navigate
        replace
        to={`/dashboard/users/talent/${encodeURIComponent(candidateId)}?jobTitle=${encodeURIComponent(jobTitle)}`}
      />
    );
  return <TalentsResultsPage searchParams={{ jobTitle }} />;
};
