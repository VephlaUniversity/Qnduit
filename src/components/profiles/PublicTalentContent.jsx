import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { createPortfolioTracker } from "../utils/portfolioAnalytics";
import PublicTalentPortfolioView from "./PublicTalentPortfolioView";

// Public analytics belong to this wrapper; shared views never create trackers.
export default function PublicTalentContent({ talent }) {
  const { key: navigationKey } = useLocation();
  const activityException = talent.analyticsPolicy?.activityException;
  const browserException = talent.analyticsPolicy?.browserException;
  const track = useMemo(() => createPortfolioTracker(talent.username, { activityException, browserException }, navigationKey), [talent.username, navigationKey, activityException, browserException]);
  useEffect(() => {
    const visit = () => track('portfolio_view');
    visit(); document.addEventListener('visibilitychange', visit);
    window.addEventListener('qnduit:privacy-changed', visit);
    return () => { document.removeEventListener('visibilitychange', visit); window.removeEventListener('qnduit:privacy-changed', visit); };
  }, [track]);
  return <PublicTalentPortfolioView talent={talent} onEvent={track} />;
}
