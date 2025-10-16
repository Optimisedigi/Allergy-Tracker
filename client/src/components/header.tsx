import logoImage from "@assets/allergy-track-bubs-logo-transparent_1759840057297.png";

interface HeaderProps {
  babyName: string;
  user?: any;
  title?: string;
  daysWithoutReaction?: number;
}

export default function Header({ babyName, user, title, daysWithoutReaction }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40" data-testid="header-container">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="AllergyTrack Bubs Logo" 
              className="w-10 h-10 object-contain"
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
          {daysWithoutReaction !== undefined && (
            <div className="text-right" data-testid="days-without-reaction">
              <p className="text-xs text-muted-foreground">Days without reaction:</p>
              <p className="text-lg font-bold text-foreground">{daysWithoutReaction}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
