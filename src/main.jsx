import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./constants/colors.css";
import "./constants/fonts.css";
import "./constants/times.css";
import "./style/index.css";
import "./style/main-layout.css";
import "./style/sidebar-style.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
