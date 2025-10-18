import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAustralianDate } from "@/lib/date-utils";
import { Check, X, AlertTriangle } from "lucide-react";

interface Trial {
  id: string;
  trialDate: string;
  status: string;
  notes: string | null;
  reactions: Array<{
    id: string;
    type: string[];
    severity: string;
    description: string | null;
    startedAt: string;
    endedAt: string | null;
  }>;
}

interface FoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string;
  foodId: string;
  foodName: string;
  foodEmoji?: string;
}

export default function FoodDetailModal({
  isOpen,
  onClose,
  babyId,
  foodId,
  foodName,
  foodEmoji,
}: FoodDetailModalProps) {
  const { data: trials = [], isLoading } = useQuery<Trial[]>({
    queryKey: ["/api/babies", babyId, "foods", foodId, "trials"],
    enabled: isOpen && !!babyId && !!foodId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-food-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-food-detail-title">
            <span className="text-2xl">{foodEmoji || "🍼"}</span>
            <span>{foodName} - Trial History</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : trials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trials found for this food.
          </div>
        ) : (
          <div className="space-y-4">
            {trials.map((trial) => (
              <div
                key={trial.id}
                className="border border-border rounded-lg p-4 bg-card"
                data-testid={`trial-${trial.id}`}
              >
                {/* Trial Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {trial.status === "completed" ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : trial.status === "reaction" ? (
                        <X className="w-5 h-5 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                      <span className="font-semibold text-foreground">
                        {trial.status === "completed"
                          ? "Passed"
                          : trial.status === "reaction"
                          ? "Reaction"
                          : "Observing"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`trial-date-${trial.id}`}>
                      Trial started: {formatAustralianDate(new Date(trial.trialDate))}
                    </p>
                  </div>
                </div>

                {/* Trial Notes */}
                {trial.notes && (
                  <div className="mb-3 bg-muted/30 rounded p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Notes:</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap" data-testid={`trial-notes-${trial.id}`}>
                      {trial.notes}
                    </p>
                  </div>
                )}

                {/* Reactions */}
                {trial.reactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Reactions:</p>
                    {trial.reactions.map((reaction) => (
                      <div
                        key={reaction.id}
                        className="bg-destructive/10 border border-destructive/20 rounded p-3"
                        data-testid={`reaction-${reaction.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {reaction.type.join(", ")}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                reaction.severity === "severe"
                                  ? "bg-destructive text-destructive-foreground"
                                  : reaction.severity === "moderate"
                                  ? "bg-orange-500 text-white"
                                  : "bg-orange-300 text-foreground"
                              }`}
                            >
                              {reaction.severity}
                            </span>
                          </div>
                        </div>
                        {reaction.description && (
                          <p className="text-sm text-foreground mb-2" data-testid={`reaction-description-${reaction.id}`}>
                            {reaction.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Started: {formatAustralianDate(new Date(reaction.startedAt))}</span>
                          {reaction.endedAt && (
                            <span>Ended: {formatAustralianDate(new Date(reaction.endedAt))}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
