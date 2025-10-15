import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/allergy-track-bubs-logo-transparent_1759840057297.png";

interface HeaderProps {
  babyName: string;
  user?: any;
  title?: string;
}

export default function Header({ babyName, user, title }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40" data-testid="header-container">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="AllergyTrack Bubs Logo" 
              className="w-15 h-15 object-contain"
              data-testid="logo-image"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-name">
                {title || "AllergyTrack Bubs"}
              </h1>
              <p className="text-xs text-muted-foreground" data-testid="text-baby-name">
                For {babyName}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="relative w-10 h-10 p-0"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            {/* Notification indicator - would be conditional based on unread notifications */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
