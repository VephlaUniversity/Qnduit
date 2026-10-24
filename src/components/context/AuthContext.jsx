import { useAccountSession } from "../hooks/useAccountSession";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { createAuthSessions } from "../utils/authSessions";
import { friendlyError } from "../utils/userMessage";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState({ user: null, adminUser: null, sessionMessage: "", adminSessionMessage: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [sessions] = useState(() => createAuthSessions({
    storage: localStorage, events: window,
    onChange(value) { setSnapshot(value); setIsLoading(false); },
    onEnd(scope, message) {
      // Expiry of an unrelated role must not interrupt the active dashboard.
      const adminPage = window.location.pathname.startsWith("/admin-");
      if (scope === "admin" && !adminPage || scope === "user" && adminPage) return;
      navigate(scope === "admin" ? "/admin-signin" : "/signin", { replace: true, state: { message } });
    },
  }));
  useEffect(() => sessions.start(), [sessions]);

  const signIn = async (email, password) => {
    const revision = sessions.revision();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      return sessions.adopt(data, "user", revision);
    } catch (error) {
      if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
      throw new Error(friendlyError(error, "Unable to sign in. Please try again."));
    }
  };
  const verifySignup = async (role, values) => {
    if (!["talent", "employer"].includes(role)) throw Error("Unsupported signup role.");
    const revision = sessions.revision();
    const { data } = await axios.post(`${API_BASE_URL}/api/${role === "talent" ? "talents" : "employers"}/verify`, values);
    if (data.success !== true || data.user?.userType !== role) throw Error("Unable to confirm the signup session.");
    sessions.adopt(data, "user", revision);
    return { user: data.user, token: data.token };
  };
  const adminSignIn = async (email, password) => {
    const revision = sessions.revision();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/auth/login`, { email, password });
      return sessions.adopt({ user: { ...data.admin, userType: "admin" }, token: data.token }, "admin", revision);
    } catch (error) {
      if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
      throw new Error(friendlyError(error, "Unable to sign in. Please try again."));
    }
  };
  const ownerToken = scope => {
    const current = sessions.read(scope), displayed = scope === "admin" ? snapshot.adminUser : snapshot.user;
    return displayed && current?.user.userType === displayed.userType && String(current.user.id || current.user._id) === String(displayed.id || displayed._id) ? current.token : null;
  };
  const userToken = ownerToken("user"), adminToken = ownerToken("admin");
  useAccountSession(snapshot.user);
  const value = {
    ...snapshot, isLoading, isAdminLoading: isLoading,
    isAuthenticated: !!snapshot.user, isAdminAuthenticated: !!snapshot.adminUser,
    signIn, verifySignup, adminSignIn,
    signOut: async () => sessions.clear("user", userToken),
    adminSignOut: async () => sessions.clear("admin", adminToken),
    checkAuth: async () => sessions.sync(), checkAdminAuth: async () => sessions.sync(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
