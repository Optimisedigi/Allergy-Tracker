import logoImage from "@assets/Allergy-tracker-bubs-logo_1761222543067.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HeaderProps {
  babyName: string;
  user?: any;
  title?: string;
  daysWithoutReaction?: number;
  babies?: Array<{ id: string; name: string }>;
  selectedBaby?: string;
  onBabyChange?: (babyId: string) => void;
}

export default function Header({ babyName, user, title, daysWithoutReaction, babies, selectedBaby, onBabyChange }: HeaderProps) {
  const showBabySelector = babies && babies.length > 1 && onBabyChange;

  return (
    <header style={{ backgroundColor: '#fff9eb' }} className="border-b border-border sticky top-0 z-40" data-testid="header-container">
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <img 
              src={logoImage} 
              alt="Baby Allergy Tracker Logo" 
              className="w-10 h-10 object-contain"
              data-testid="logo-image"
            />
            <div className="flex flex-col justify-start gap-1">
              <h1 className="text-base font-semibold text-foreground leading-tight" data-testid="text-app-name">
                {title || "Baby Allergy Tracker"}
              </h1>
              {showBabySelector ? (
                <Select value={selectedBaby} onValueChange={onBabyChange}>
                  <SelectTrigger className="h-7 w-[180px] text-sm bg-white" data-testid="select-baby-profile">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {babies.map((baby) => (
                      <SelectItem key={baby.id} value={baby.id} data-testid={`option-baby-${baby.id}`}>
                        {baby.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-baby-name">
                  For {babyName}
                </p>
              )}
            </div>
          </div>
          {daysWithoutReaction !== undefined && (
            <div className="text-right flex flex-col justify-start" data-testid="days-without-reaction">
              <p className="text-xs text-muted-foreground leading-tight">Days without<br />reaction:</p>
              <p className="text-lg font-bold text-foreground">{daysWithoutReaction}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
