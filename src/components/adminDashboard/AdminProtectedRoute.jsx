import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Reads only the separate admin session (adminUser/isAdminAuthenticated),
// never the talent/employer user/isAuthenticated — so a talent or employer
// session can never grant, and an admin session can never be mistaken for,
// access here.
export const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuthenticated, isAdminLoading } = useAuth();
  const location = useLocation();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E0E10]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <Navigate
        to="/admin-signin"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default AdminProtectedRoute;
