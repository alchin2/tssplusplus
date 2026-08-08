import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { VercelAnalytics } from "./components/VercelAnalytics";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <VercelAnalytics />
  </StrictMode>,
);
