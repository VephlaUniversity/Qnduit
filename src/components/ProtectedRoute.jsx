import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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
          message: "Please sign in to access the dashboard",
        }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
