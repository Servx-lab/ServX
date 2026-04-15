import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

/**
 * Shared layout for all dashboard pages. Keeps the Sidebar mounted
 * across navigations so it doesn't blink when switching routes.
 *
 * Shell geometry: dark outer frame → rounded inner track → white main panel with
 * its own radius so the dark layer fills the curved gaps at every corner.
 */
const DashboardLayout = () => {
  return (
    <div className="box-border flex h-[100dvh] w-full overflow-hidden bg-zinc-950 p-2 sm:p-3">
      <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/[0.08] sm:rounded-3xl">
        <Sidebar />
        {/* Dark gutter: lets the white panel’s rounded corners read against the frame */}
        <div className="flex min-h-0 min-w-0 flex-1 bg-zinc-950 py-2 pr-2 pl-1.5 pt-2 sm:pl-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-background shadow-lg ring-1 ring-black/[0.04] sm:rounded-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
