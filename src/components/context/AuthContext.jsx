import { createContext, useState, useEffect } from "react";
import {
  MOCK_EMPLOYER_CREDENTIALS,
  MOCK_EMPLOYER_DATA,
  MOCK_TALENT_CREDENTIALS,
  MOCK_TALENT_DATA,
} from "../utils/mockUser";

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
      let userData = null;

      if (
        email === MOCK_EMPLOYER_CREDENTIALS.email &&
        password === MOCK_EMPLOYER_CREDENTIALS.password
      ) {
        userData = { ...MOCK_EMPLOYER_DATA };
      } else if (
        email === MOCK_TALENT_CREDENTIALS.email &&
        password === MOCK_TALENT_CREDENTIALS.password
      ) {
        userData = { ...MOCK_TALENT_DATA };
      } else {
        throw new Error("Invalid email or password");
      }

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData; // Return user data to determine redirect
    } catch (error) {
      console.error("Sign in error:", error);
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
