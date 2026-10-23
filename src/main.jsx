import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import DashboardBackground from "./components/DashboardBackground";

import axios from "axios";
import { API_BASE_URL } from "./components/utils/api";
import { installPollingRateLimits } from "./components/utils/pollingCooldown";
import { browserSessions, installRequestSafety, requestSafety } from "./components/utils/requestSafety";
import { RequestSafetyStatus } from "./components/RequestSafetyStatus";

const stopPollingRateLimits = installPollingRateLimits(axios, {
  apiBaseUrl: API_BASE_URL,
  readSession() {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const id = user?._id || user?.id;
      return user && id ? { actor: `${user.userType}:${id}`, token: localStorage.getItem("token") } : null;
    } catch { return null; }
  },
});
if (import.meta.hot) import.meta.hot.dispose(stopPollingRateLimits);
const stopRequestSafety = installRequestSafety(axios, { apiBaseUrl: API_BASE_URL, readSessions: browserSessions, safety: requestSafety });
if (import.meta.hot) import.meta.hot.dispose(stopRequestSafety);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <DashboardBackground />
      <RequestSafetyStatus />
      <App />
    </BrowserRouter>
  </StrictMode>
);
