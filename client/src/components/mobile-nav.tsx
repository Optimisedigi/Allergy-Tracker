import { Link, useLocation } from "wouter";
import { Home, BarChart3, HelpCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab?: "home" | "reports" | "how-it-works" | "settings";
}

export default function MobileNav({ activeTab }: MobileNavProps) {
  const [location] = useLocation();

  const getActiveTab = () => {
    if (activeTab) return activeTab;
    if (location === "/reports") return "reports";
    if (location === "/how-it-works") return "how-it-works";
    if (location === "/settings") return "settings";
    return "home";
  };

  const currentTab = getActiveTab();

  return (
    <nav className="mobile-nav" data-testid="mobile-nav">
      <Link 
        href="/" 
        className={cn("nav-item", currentTab === "home" && "active")} 
        data-testid="nav-home"
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </Link>
      <Link 
        href="/reports" 
        className={cn("nav-item", currentTab === "reports" && "active")} 
        data-testid="nav-reports"
      >
        <BarChart3 className="w-5 h-5" />
        <span>Reports</span>
      </Link>
      <Link 
        href="/how-it-works" 
        className={cn("nav-item", currentTab === "how-it-works" && "active")} 
        data-testid="nav-how-it-works"
      >
        <HelpCircle className="w-5 h-5" />
        <span>How it works</span>
      </Link>
      <Link 
        href="/settings" 
        className={cn("nav-item", currentTab === "settings" && "active")} 
        data-testid="nav-settings"
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
