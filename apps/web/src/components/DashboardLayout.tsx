import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import AttackPathsWarmup from "@/features/attack-paths/AttackPathsWarmup";

/**
 * Shared layout for all dashboard pages. Keeps the Sidebar mounted
 * across navigations so it doesn't blink when switching routes.
 *
 * Shell geometry: dark outer frame → rounded inner track → white main panel with
 * its own radius so the dark layer fills the curved gaps at every corner.
 */
const DashboardLayout = () => {
  return (
    <div className="box-border flex h-[100dvh] w-full overflow-hidden bg-black p-2 sm:p-3">
      <AttackPathsWarmup />
      <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[2rem] bg-zinc-950 transition-all duration-300">
        <Sidebar />
        {/* Dark gutter: lets the white panel’s rounded corners read against the frame */}
        <div className="flex min-h-0 min-w-0 flex-1 bg-zinc-950 py-2 pr-2 pl-2 pt-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-background shadow-lg ring-1 ring-black/[0.04]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
