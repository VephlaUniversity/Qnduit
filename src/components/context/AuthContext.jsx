import { createContext, useState, useEffect } from "react";
import {
  MOCK_EMPLOYER_CREDENTIALS,
  MOCK_EMPLOYER_DATA,
  MOCK_TALENT_CREDENTIALS,
  MOCK_TALENT_DATA,
  MOCK_ADMIN_CREDENTIALS,
  MOCK_ADMIN_DATA,
} from "../utils/mockUser";
import axios from "axios";
import { API_BASE_URL } from "../utils/api"; // Make sure this points to your backend base URL

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);

    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser || storedUser === "undefined" || storedUser === "null") {
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser && parsedUser.userType) {
        setUser(parsedUser);
      } else {
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminAuth = async () => {
    setIsAdminLoading(true);

    try {
      const storedAdmin = localStorage.getItem("adminUser");

      if (
        !storedAdmin ||
        storedAdmin === "undefined" ||
        storedAdmin === "null"
      ) {
        setAdminUser(null);
        return;
      }

      const parsedAdmin = JSON.parse(storedAdmin);

      if (parsedAdmin && parsedAdmin.userType === "admin") {
        setAdminUser(parsedAdmin);
      } else {
        localStorage.removeItem("adminUser");
        setAdminUser(null);
      }
    } catch (error) {
      console.error("Admin auth check error:", error);
      localStorage.removeItem("adminUser");
      setAdminUser(null);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = res.data;

      if (!user || !user.userType) {
        throw new Error("Invalid user data returned from server");
      }

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      setUser(user);

      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw new Error(
        error.response?.data?.message || "Invalid email or password",
      );
    }
  };

  const adminSignIn = async (email, password) => {
    if (email?.trim().toLowerCase() !== MOCK_ADMIN_CREDENTIALS.email) {
      throw new Error("Invalid email or password");
    }
    if (password !== MOCK_ADMIN_CREDENTIALS.password) {
      throw new Error("Invalid email or password");
    }

    localStorage.setItem("adminUser", JSON.stringify(MOCK_ADMIN_DATA));
    localStorage.setItem("adminToken", "local-admin-session");
    setAdminUser(MOCK_ADMIN_DATA);
    return MOCK_ADMIN_DATA;
  };

  const adminSignOut = async () => {
    try {
      setAdminUser(null);
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
    } catch (error) {
      console.error("Admin sign out error:", error);
      throw error;
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      // Create user based on userType
      const baseData =
        userData.userType === "talent" ? MOCK_TALENT_DATA : MOCK_EMPLOYER_DATA;
      const mockUser = {
        ...baseData,
        id: Math.random().toString(36).substr(2, 9),
        email,
        ...userData,
      };
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
      return mockUser; // Return user data to determine redirect
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("pendingPlanSelection");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
    checkAdminAuth();
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    checkAuth,
    adminUser,
    isAdminAuthenticated: !!adminUser,
    isAdminLoading,
    adminSignIn,
    adminSignOut,
    checkAdminAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
