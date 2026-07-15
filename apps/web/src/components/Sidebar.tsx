import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Route,
  PenTool,
  Calendar,
  Shield,
  FileText,
  Settings,
  ChevronDown,
  Database,
  Github,
  Server as ServerIcon,
  Stethoscope,
  Activity,
  LogOut,
  User as UserIcon,
  Mail
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useConnections } from "@/features/databases/hooks";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Stethoscope, label: "Auto-Medic Pipeline", to: "/auto-medic" },
  { icon: Activity, label: "Global Operations", to: "/operations" },
  { icon: Database, label: "Databases", to: "/databases" },
  { icon: ServerIcon, label: "Hosting & Servers", to: "/hosting/render" },
  { icon: Github, label: "GitHub", to: "/github" },
  { icon: Search, label: "Exposure Analysis", to: "/exposure" },
  { icon: Route, label: "Attack Paths", to: "/attack" },
  { icon: PenTool, label: "Scenario Designer", to: "/scenarios" },
  { icon: Mail, label: "Emails", to: "/emails" },
  { icon: Shield, label: "Administration", to: "/admin" },
  { icon: FileText, label: "Governance Center", to: "/reports" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { connections } = useConnections();

  const hasDeployments = connections.some(c => 
    c.provider && (c.provider.toLowerCase() === 'vercel' || c.provider.toLowerCase() === 'render')
  );

  const filteredNavItems = navItems.filter(item => {
    if (item.to === "/auto-medic") {
      return hasDeployments;
    }
    return true;
  });

  return (
    <div className="glass-sidebar w-56 shrink-0 h-full min-h-0 flex flex-col py-6 px-3 relative z-40 overflow-y-auto no-scrollbar rounded-tl-[2rem] rounded-bl-[2rem]">
      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${
              isActive
                ? "pill-active"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            }`}
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-border/50">
        <NavLink
          to="/settings"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${
            isActive
              ? "pill-active"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          }`}
        >
          <Settings className="w-4.5 h-4.5 flex-shrink-0" />
          <span>Settings</span>
        </NavLink>
      </div>

    </div>
  );
};


export default Sidebar;
