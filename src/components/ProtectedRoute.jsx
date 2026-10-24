import { useSyncExternalStore } from "react";
import { UserSupport } from "./support/UserSupport";
import { browserSessions, requestSafety } from "./utils/requestSafety";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, sessionMessage, user, signOut } = useAuth();
  const location = useLocation();
  const state = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const actor = user && `${user.userType}:${user.id || user._id}`;
  const suspended = browserSessions().some(owner => owner.actor === actor) && state.suspended.includes(actor);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E0E10]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/signin"
        state={{
          from: location,
          message: sessionMessage || "Please sign in to access the dashboard",
        }}
        replace
      />
    );
  }

  if (suspended) {
    const supportPath = user.userType === "talent" ? "/talent-dashboard/support" : "/dashboard/support";
    return <main className="min-h-screen bg-[#0E0E10] p-6 text-white">
      <h1 className="text-2xl font-semibold">Your account is suspended</h1>
      <p className="my-4">You can contact Support, check account status, or sign out.</p>
      <nav className="flex gap-4"><Link to={supportPath} className="underline">Support</Link><button type="button" onClick={signOut}>Sign out</button></nav>
      {location.pathname.replace(/\/$/, "") === supportPath && <UserSupport key={actor} />}
    </main>;
  }
  return children;
};

export default ProtectedRoute;
