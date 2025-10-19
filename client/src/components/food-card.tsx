import BrickChart from "@/components/brick-chart";
import { Check, CircleAlert, Clock, Trash2, AlertTriangle, X } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface FoodCardProps {
  food: {
    id: string;
    name: string;
    emoji?: string;
  };
  bricks: Array<{
    type: string;
    date: string;
  }>;
  passCount: number;
  reactionCount: number;
  lastTrial: Date | null;
  hasActiveTrial?: boolean;
  onDelete?: () => void;
}

export default function FoodCard({ food, bricks, passCount, reactionCount, lastTrial, hasActiveTrial = false, onDelete }: FoodCardProps) {
  // Calculate status based on passes, reactions, bricks, and active trials (matching Reports page logic)
  const getStatus = (passes: number, reactions: number, bricks: Array<{ type: string; date: string }>) => {
    // Check for 3 consecutive red bricks
    let hasConsecutiveRedBricks = false;
    let consecutiveReds = 0;
    
    for (const brick of bricks) {
      if (brick.type === 'warning') {
        consecutiveReds = 0; // Reset counter when we find amber
      } else if (brick.type === 'reaction') {
        consecutiveReds++;
        if (consecutiveReds >= 3) {
          hasConsecutiveRedBricks = true;
          break;
        }
      } else {
        // Safe brick resets everything
        consecutiveReds = 0;
      }
    }
    
    // Check for 3 consecutive safe bricks
    let hasConsecutiveSafeBricks = false;
    let consecutiveSafes = 0;
    
    for (const brick of bricks) {
      if (brick.type === 'safe') {
        consecutiveSafes++;
        if (consecutiveSafes >= 3) {
          hasConsecutiveSafeBricks = true;
          break;
        }
      } else {
        // Any non-safe brick resets the counter
        consecutiveSafes = 0;
      }
    }
    
    // Check for confirmed allergy (3 consecutive red bricks)
    if (hasConsecutiveRedBricks) {
      return hasActiveTrial ? "Confirmed allergy" : "Confirmed allergy";
    }
    
    // Check for safe food with past reactions (3 consecutive safe bricks but has reactions in history)
    if (hasConsecutiveSafeBricks && reactions > 0) {
      return "Safe, sensitive";
    }
    
    // Safe food (3+ passes, no reactions)
    if (passes >= 3 && reactions === 0) {
      return "Safe food";
    }
    
    // No trials yet
    if (passes === 0 && reactions === 0) return "Not tried";
    
    // Early stage passes
    if (passes === 1 && reactions === 0) return "Passed once";
    if (passes === 2 && reactions === 0) return "Building";
    
    // 3+ passes with reactions
    if (passes >= 3 && reactions === 1) return "Caution";
    if (passes >= 3 && reactions >= 2) return "Likely allergy";
    
    // Less than 3 passes with reactions
    if (passes < 3 && reactions === 1) return "Possible";
    if (passes < 3 && reactions >= 2) return "Suspected";
    
    return "Testing";
  };

  const status = getStatus(passCount, reactionCount, bricks);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "Safe food":
        return { icon: <Check className="w-4 h-4" />, color: "text-success" };
      case "Safe, sensitive":
      case "Caution":
      case "Possible":
        return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-500" };
      case "Likely allergy":
      case "Suspected":
      case "Confirmed allergy":
        return { icon: <X className="w-4 h-4" />, color: "text-destructive" };
      case "Building":
      case "Passed once":
        return { icon: <Check className="w-4 h-4" />, color: "text-success" };
      default:
        return { icon: <Clock className="w-4 h-4" />, color: "text-muted-foreground" };
    }
  };

  const statusDisplay = getStatusDisplay(status);

  return (
    <div 
      className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      data-testid={`food-card-${food.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" data-testid={`food-emoji-${food.id}`}>
          {food.emoji || "🍼"}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate" data-testid={`food-name-${food.id}`}>
            {food.name}
          </h4>
          <p className="text-xs text-muted-foreground" data-testid={`food-last-trial-${food.id}`}>
            Last: {lastTrial ? formatAustralianDate(lastTrial, "short") : "Never"}
          </p>
        </div>
      </div>
      
      <div className="min-h-[100px] mb-3">
        <BrickChart bricks={bricks} data-testid={`brick-chart-${food.id}`} />
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium flex items-center gap-1 ${statusDisplay.color}`}>
          {statusDisplay.icon}
          <span data-testid={`food-status-${food.id}`}>{status}</span>
        </span>
        {onDelete && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            data-testid={`button-delete-food-${food.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
