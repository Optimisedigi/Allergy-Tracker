import { Link, useLocation } from "wouter";
import { Home, BarChart3, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab?: "home" | "reports" | "alerts" | "settings";
}

export default function MobileNav({ activeTab }: MobileNavProps) {
  const [location] = useLocation();

  const getActiveTab = () => {
    if (activeTab) return activeTab;
    if (location === "/reports") return "reports";
    if (location === "/settings") return "settings";
    return "home";
  };

  const currentTab = getActiveTab();

  return (
    <nav className="mobile-nav" data-testid="mobile-nav">
      <Link href="/">
        <a className={cn("nav-item", currentTab === "home" && "active")} data-testid="nav-home">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </a>
      </Link>
      <Link href="/reports">
        <a className={cn("nav-item", currentTab === "reports" && "active")} data-testid="nav-reports">
          <BarChart3 className="w-5 h-5" />
          <span>Reports</span>
        </a>
      </Link>
      <a href="#" className={cn("nav-item", currentTab === "alerts" && "active")} data-testid="nav-alerts">
        <Bell className="w-5 h-5" />
        <span>Alerts</span>
      </a>
      <Link href="/settings">
        <a className={cn("nav-item", currentTab === "settings" && "active")} data-testid="nav-settings">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </a>
      </Link>
    </nav>
  );
}
