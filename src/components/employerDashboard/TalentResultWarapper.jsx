import TalentsResultsPage from "./TalentResultsPage";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import { browserSessions } from "../utils/requestSafety";

export const TalentResultsWrapper = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  if (user?.userType !== "employer") return <Navigate replace to="/talent-dashboard" />;
  const actor = `employer:${user.id || user._id}`;
  const owner = browserSessions().find(session => session.actor === actor);
  if (!owner) return <Navigate replace to="/signin" />;
  const candidateId = searchParams.get("candidateId");
  if (candidateId) {
    const context = new URLSearchParams(searchParams);
    context.delete("candidateId");
    return <Navigate replace to={`/dashboard/users/talent/${encodeURIComponent(candidateId)}?${context}`} />;
  }
  // Remount all private results, saves and feedback on identity or token changes.
  return <DashboardLayout key={`${owner.actor}:${owner.token}`}><TalentsResultsPage owner={owner} /></DashboardLayout>;
};
