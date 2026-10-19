import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function DashboardBackground() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute(
      "data-dashboard-background",
      /^\/(?:dashboard|talent-dashboard)(?:\/|$)/.test(pathname),
    );
  }, [pathname]);
  return null;
}
