import BrickChart from "@/components/brick-chart";
import { Check, CircleAlert, Clock } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";

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
}

export default function FoodCard({ food, bricks, passCount, reactionCount, lastTrial }: FoodCardProps) {
  const getStatusIcon = () => {
    if (reactionCount > 0) {
      return <CircleAlert className="w-4 h-4" />;
    }
    if (passCount > 0) {
      return <Check className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (reactionCount > 0) {
      return `${reactionCount} reaction${reactionCount > 1 ? 's' : ''}`;
    }
    if (passCount > 0) {
      return `${passCount} pass${passCount > 1 ? 'es' : ''}`;
    }
    return "Observing";
  };

  const getStatusColor = () => {
    if (reactionCount > 0) {
      return "text-destructive";
    }
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
      </div>
    </div>
  );
}
