import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

/**
 * Shared layout for all dashboard pages. Keeps the Sidebar mounted
 * across navigations so it doesn't blink when switching routes.
 */
const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full cyber-gradient-bg dot-grid overflow-hidden">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col h-screen overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
