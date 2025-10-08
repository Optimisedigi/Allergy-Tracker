import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { formatAustralianDateTime } from "@/lib/date-utils";

interface SteroidCreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string;
}

interface SteroidCream {
  id: string;
  babyId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationDays: number;
  notes: string | null;
  status: string;
}

export default function SteroidCreamModal({ isOpen, onClose, babyId }: SteroidCreamModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [durationDays, setDurationDays] = useState("3");
  const [notes, setNotes] = useState("");

  const { data: activeCream, isLoading } = useQuery<SteroidCream | null>({
    queryKey: ["/api/babies", babyId, "steroid-cream", "active"],
    queryFn: async () => {
      const response = await fetch(`/api/babies/${babyId}/steroid-cream/active`);
      if (!response.ok) throw new Error("Failed to fetch steroid cream status");
      return response.json();
    },
    enabled: isOpen && !!babyId,
  });

  const startCreamMutation = useMutation({
    mutationFn: async (data: { durationDays: number; notes?: string }) => {
      const response = await apiRequest("POST", `/api/babies/${babyId}/steroid-cream`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies", babyId, "steroid-cream", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", babyId] });
      toast({
        title: "Steroid Cream Started",
        description: "Cream tracking has been started successfully",
      });
      setNotes("");
      setDurationDays("3");
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to start steroid cream tracking",
        variant: "destructive",
      });
    },
  });

  const endCreamMutation = useMutation({
    mutationFn: async (creamId: string) => {
      const response = await apiRequest("PATCH", `/api/steroid-cream/${creamId}/end`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies", babyId, "steroid-cream", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", babyId] });
      toast({
        title: "Steroid Cream Ended",
        description: "Cream tracking has been stopped",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to end steroid cream tracking",
        variant: "destructive",
      });
    },
  });

  const handleStartCream = (e: React.FormEvent) => {
    e.preventDefault();
    startCreamMutation.mutate({
      durationDays: parseInt(durationDays),
      notes: notes.trim() || undefined,
    });
  };

  const handleEndCream = () => {
    if (activeCream?.id) {
      endCreamMutation.mutate(activeCream.id);
    }
  };

  const getExpectedEndDate = () => {
    if (!activeCream) return null;
    const startDate = new Date(activeCream.startedAt);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + activeCream.durationDays);
    return endDate;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md" data-testid="dialog-steroid-cream">
          <DialogHeader>
            <DialogTitle>Steroid Cream Tracking</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-steroid-cream">
        <DialogHeader>
          <DialogTitle>Steroid Cream Tracking</DialogTitle>
        </DialogHeader>

        {activeCream ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Steroid cream is currently active
                  </p>
                  <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p>Started: {formatAustralianDateTime(new Date(activeCream.startedAt), "datetime")}</p>
                    {getExpectedEndDate() && (
                      <p>Expected end: {formatAustralianDateTime(getExpectedEndDate()!, "datetime")}</p>
                    )}
                    <p>Duration: {activeCream.durationDays} days</p>
                    {activeCream.notes && (
                      <p className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        Note: {activeCream.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                ⚠️ <strong>Important:</strong> Wait 2 weeks after stopping steroid cream before introducing new foods to ensure accurate allergy testing.
              </p>
            </div>

            <Button
              onClick={handleEndCream}
              disabled={endCreamMutation.isPending}
              className="w-full"
              variant="destructive"
              data-testid="button-end-cream"
            >
              {endCreamMutation.isPending ? "Ending..." : "Stop Cream Tracking"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleStartCream} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                data-testid="input-cream-duration"
                required
              />
              <p className="text-xs text-muted-foreground">
                Typical treatment is 3-7 days
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brand, strength, affected area..."
                rows={3}
                data-testid="input-cream-notes"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                ⚠️ <strong>Note:</strong> Steroid creams can suppress allergic reactions. Wait 2 weeks after treatment ends before introducing new foods.
              </p>
            </div>

            <Button
              type="submit"
              disabled={startCreamMutation.isPending}
              className="w-full"
              data-testid="button-start-cream"
            >
              {startCreamMutation.isPending ? "Starting..." : "Start Cream Tracking"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
