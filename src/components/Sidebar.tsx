import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Search, label: "Exposure Analysis" },
  { icon: Route, label: "Attack Paths" },
  { icon: PenTool, label: "Scenario Designer" },
  { icon: Calendar, label: "Events" },
  { icon: Shield, label: "Administration" },
  { icon: FileText, label: "Report Center" },
];

const bottomItems = [
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Support" },
];

const Sidebar = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="glass-sidebar w-56 h-screen flex flex-col py-6 px-3 fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center cyber-glow-blue">
          <Shield className="w-4.5 h-4.5 text-primary" />
        </div>
        <span className="text-foreground font-semibold text-lg tracking-wide">CyberX</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item, i) => (
          <motion.button
            key={item.label}
            onClick={() => setActiveIndex(i)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${
              activeIndex === i
                ? "pill-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col gap-1 mb-4">
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

      {/* User Profile */}
      <div className="glass-card px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/80 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
          JM
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">James McIntyre</p>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default Sidebar;
