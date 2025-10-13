import BrickChart from "@/components/brick-chart";
import { Check, CircleAlert, Clock, Trash2 } from "lucide-react";
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
  onDelete?: () => void;
}

export default function FoodCard({ food, bricks, passCount, reactionCount, lastTrial, onDelete }: FoodCardProps) {
  // Count brick types
  const safeCount = bricks.filter(b => b.type === 'safe').length;
  const warningCount = bricks.filter(b => b.type === 'warning').length;
  const reactionBrickCount = bricks.filter(b => b.type === 'reaction').length;
  
  // Calculate effective safe count (warnings neutralize safe bricks)
  const effectiveSafeCount = Math.max(0, safeCount - warningCount);

  const getStatusIcon = () => {
    // 2+ reactions = Likely Allergy
    if (reactionBrickCount >= 2) {
      return <CircleAlert className="w-4 h-4" />;
    }
    // 2+ warnings = Caution
    if (warningCount >= 2) {
      return <CircleAlert className="w-4 h-4" />;
    }
    // 3+ effective safe = Safe
    if (effectiveSafeCount >= 3) {
      return <Check className="w-4 h-4" />;
    }
    // Any reaction or warning without meeting above criteria
    if (reactionBrickCount > 0 || warningCount > 0) {
      return <CircleAlert className="w-4 h-4" />;
    }
    // Any passes
    if (safeCount > 0) {
      return <Check className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    // 2+ reactions = Likely Allergy
    if (reactionBrickCount >= 2) {
      return "Likely Allergy";
    }
    // 2+ warnings without being likely allergy = Caution
    if (warningCount >= 2) {
      return "Caution";
    }
    // 3+ effective safe = Safe
    if (effectiveSafeCount >= 3) {
      return "Safe";
    }
    // Mixed results but not enough to be conclusive
    if (reactionCount > 0 && passCount > 0) {
      return `${passCount} pass${passCount > 1 ? 'es' : ''}, ${reactionCount} reaction${reactionCount > 1 ? 's' : ''}`;
    }
    if (reactionCount > 0) {
      return `${reactionCount} reaction${reactionCount > 1 ? 's' : ''}`;
    }
    if (passCount > 0) {
      return `${passCount} pass${passCount > 1 ? 'es' : ''}`;
    }
    return "Observing";
  };

  const getStatusColor = () => {
    // 2+ reactions = red
    if (reactionBrickCount >= 2) {
      return "text-destructive";
    }
    // 2+ warnings = amber/orange
    if (warningCount >= 2) {
      return "text-orange-500";
    }
    // 3+ effective safe = green
    if (effectiveSafeCount >= 3) {
      return "text-success";
    }
    // Any reaction or warning = orange
    if (reactionCount > 0 || warningCount > 0) {
      return "text-orange-500";
    }
    // Any passes = green
    if (passCount > 0) {
      return "text-success";
    }
    return "text-muted-foreground";
  };

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
        <span className={`text-xs font-medium flex items-center gap-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span data-testid={`food-status-${food.id}`}>{getStatusText()}</span>
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
