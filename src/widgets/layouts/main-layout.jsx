import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../components/sidebar";
import Topbar from "../components/Topbar";

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className={`app-layout${collapsed ? " sidebar-collapsed" : ""}`}
    >
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />

      <main className="main-content">
        <Topbar />

        <div
          className="page-container"
          key={location.pathname}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;