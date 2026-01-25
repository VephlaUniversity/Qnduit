import { createContext, useState, useEffect } from "react";
import {
  MOCK_EMPLOYER_CREDENTIALS,
  MOCK_EMPLOYER_DATA,
  MOCK_TALENT_CREDENTIALS,
  MOCK_TALENT_DATA,
} from "../utils/mockUser";
import axios from "axios";
import { API_BASE_URL } from "../utils/api"; // Make sure this points to your backend base URL

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = res.data;

      // Store user and token
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      // Set state
      setUser(user);

      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw new Error(
        error.response?.data?.message || "Invalid email or password",
      );
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
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
