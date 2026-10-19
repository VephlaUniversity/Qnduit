import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import DashboardBackground from "./components/DashboardBackground";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <DashboardBackground />
      <App />
    </BrowserRouter>
  </StrictMode>
);
