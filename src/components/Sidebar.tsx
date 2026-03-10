import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SecurityInfo from "./SecurityInfo";
import WorkspaceBranding from "./WorkspaceBranding";
import {
  LayoutDashboard,
  Search,
  Route,
  PenTool,
  Calendar,
  Shield,
  FileText,
  Settings,
  HelpCircle,
  ChevronDown,
  Database,
  Github,
  Server as ServerIcon,
  Stethoscope,
  Activity,
  LogOut,
  User as UserIcon
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

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Stethoscope, label: "Auto-Medic Pipeline", to: "/auto-medic" },
  { icon: Activity, label: "Global Operations", to: "/operations" },
  { icon: Database, label: "Databases", to: "/databases" },
  { icon: ServerIcon, label: "Hosting & Servers", to: "/hosting/render" },
  { icon: Github, label: "GitHub", to: "/github" },
  { icon: Search, label: "Exposure Analysis", to: "/exposure" },
  { icon: Route, label: "Attack Paths", to: "/attack-paths" },
  { icon: PenTool, label: "Scenario Designer", to: "/scenarios" },
  { icon: Calendar, label: "Events", to: "/events" },
  { icon: Shield, label: "Administration", to: "/admin" },
  { icon: FileText, label: "Report Center", to: "/reports" },
];

const bottomItems = [
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Support" },
];

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="glass-sidebar w-56 h-screen flex flex-col py-6 px-3 fixed left-0 top-0 z-50 overflow-y-auto no-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center cyber-glow-blue">
          <Shield className="w-4.5 h-4.5 text-primary" />
        </div>
        <span className="text-foreground font-semibold text-lg tracking-wide">ORIZON</span>
      </div>

      {/* Workspace Branding */}
      <WorkspaceBranding ownerName="Chitkul" />

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          item.subItems ? (
             <Collapsible key={item.label} className="group/collapsible">
                <CollapsibleTrigger className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left text-muted-foreground hover:bg-secondary/50 hover:text-foreground group-data-[state=open]/collapsible:text-foreground">
                    <item.icon className="w-5 h-5 opacity-70 group-data-[state=open]/collapsible:opacity-100 group-data-[state=open]/collapsible:text-primary" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown className="w-4 h-4 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-3">
                        {item.subItems.map((sub) => (
                            <NavLink
                                key={sub.label}
                                to={sub.to}
                                className={({ isActive }) => `block px-3 py-2 text-xs rounded-md transition-colors ${
                                    isActive ? 'text-primary bg-primary/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                                }`}
                            >
                                {sub.label}
                            </NavLink>
                        ))}
                    </div>
                </CollapsibleContent>
             </Collapsible>
          ) : (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${
              isActive
                ? "pill-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        )
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col gap-1 mb-4 mt-4">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 w-full text-left"
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Security Info Widget */}
      <SecurityInfo />

      {/* User Profile with Logout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="glass-card px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/80 transition-colors mt-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user?.displayName
                  ? user.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                  : "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.displayName || user?.email || "User"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 mb-2 side-dropdown-content">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer gap-2">
            <UserIcon className="w-4 h-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => (window.location.href = '/settings')}>
            <Settings className="w-4 h-4" />
            <span>Configuration</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10" 
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};


export default Sidebar;
