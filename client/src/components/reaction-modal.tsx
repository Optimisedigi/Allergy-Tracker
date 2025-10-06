import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle, CalendarIcon } from "lucide-react";
import { formatAustralianDateTime } from "@/lib/date-utils";
import { format } from "date-fns";

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialId: string;
  foodName: string;
  foodEmoji?: string;
}

const REACTION_TYPES = [
  "itchiness",
  "hives", 
  "swelling",
  "rash",
  "vomiting",
  "diarrhea"
];

const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild", color: "success" },
  { value: "moderate", label: "Moderate", color: "accent" },
  { value: "severe", label: "Severe", color: "destructive" }
] as const;

export default function ReactionModal({ 
  isOpen, 
  onClose, 
  trialId, 
  foodName, 
  foodEmoji 
}: ReactionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [startedAt, setStartedAt] = useState(formatAustralianDateTime(new Date(), "datetime"));
  const [resolvedDate, setResolvedDate] = useState<Date | undefined>(undefined);
  const [resolvedHour, setResolvedHour] = useState<string>("");
  const [resolvedMinute, setResolvedMinute] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTypes([]);
      setSeverity("mild");
      setStartedAt(formatAustralianDateTime(new Date(), "datetime"));
      setResolvedDate(undefined);
      setResolvedHour("");
      setResolvedMinute("");
      setNotes("");
    }
  }, [isOpen]);

  // Log reaction mutation
  const logReactionMutation = useMutation({
    mutationFn: async (reactionData: {
      types: string[];
      severity: "mild" | "moderate" | "severe";
      startedAt: string;
      resolvedAt?: string;
      notes?: string;
    }) => {
      const response = await apiRequest("POST", `/api/trials/${trialId}/reactions`, {
        types: reactionData.types,
        severity: reactionData.severity,
        startedAt: new Date(reactionData.startedAt).toISOString(),
        resolvedAt: reactionData.resolvedAt ? new Date(reactionData.resolvedAt).toISOString() : undefined,
        notes: reactionData.notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Reaction Logged",
        description: "Reaction has been recorded successfully",
      });
      handleClose();
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
        description: "Failed to log reaction",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedTypes([]);
    setSeverity("mild");
    setStartedAt(formatAustralianDateTime(new Date(), "datetime"));
    setResolvedDate(undefined);
    setResolvedHour("");
    setResolvedMinute("");
    setNotes("");
    onClose();
  };

  const handleTypeToggle = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, type]);
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== type));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTypes.length === 0) {
      toast({
        title: "Reaction Type Required",
        description: "Please select at least one reaction type",
        variant: "destructive",
      });
      return;
    }

    if (!startedAt) {
      toast({
        title: "Start Time Required", 
        description: "Please specify when the reaction started",
        variant: "destructive",
      });
      return;
    }

    // Combine resolved date and time if both are provided
    let resolvedAtString: string | undefined = undefined;
    if (resolvedDate && resolvedHour && resolvedMinute) {
      const resolved = new Date(resolvedDate);
      resolved.setHours(parseInt(resolvedHour), parseInt(resolvedMinute), 0, 0);
      resolvedAtString = resolved.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
    }

    logReactionMutation.mutate({
      types: selectedTypes,
      severity,
      startedAt,
      resolvedAt: resolvedAtString,
      notes: notes.trim() || undefined,
    });
  };

  if (!trialId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-reaction">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Log Reaction
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-reaction-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Food Name Display */}
        <div className="p-4 bg-muted/50 rounded-lg mb-6" data-testid="reaction-food-info">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{foodEmoji || "🍼"}</span>
            <div>
              <p className="text-sm text-muted-foreground">Reaction to</p>
              <p className="font-semibold text-lg text-foreground">{foodName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-log-reaction">
          {/* Reaction Type */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-3">
              Reaction Type *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {REACTION_TYPES.map((type) => (
                <label 
                  key={type}
                  className="relative flex items-center p-3 bg-muted border border-border rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary transition-all"
                >
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => handleTypeToggle(type, checked as boolean)}
                    className="mr-3"
                    data-testid={`checkbox-reaction-${type}`}
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-3">
              Severity *
            </Label>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSeverity(level.value)}
                  className={`flex-1 p-3 text-center border-2 rounded-lg cursor-pointer transition-all ${
                    severity === level.value 
                      ? level.value === "mild" 
                        ? "border-green-600 bg-green-50 dark:bg-green-950" 
                        : level.value === "moderate"
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-950"
                        : "border-red-600 bg-red-50 dark:bg-red-950"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  data-testid={`radio-severity-${level.value}`}
                >
                  <p className="font-medium text-sm">{level.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="startedAt" className="block text-sm font-medium text-foreground mb-2">
                Started on *
              </Label>
              <Input
                id="startedAt"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
                data-testid="input-reaction-started"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Ends on (Optional)
              </Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-resolved-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {resolvedDate ? format(resolvedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={resolvedDate}
                      onSelect={setResolvedDate}
                      initialFocus
                      data-testid="calendar-resolved-date"
                    />
                  </PopoverContent>
                </Popover>
                
                {resolvedDate && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={resolvedHour} onValueChange={setResolvedHour}>
                      <SelectTrigger data-testid="select-resolved-hour">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                            {i.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={resolvedMinute} onValueChange={setResolvedMinute}>
                      <SelectTrigger data-testid="select-resolved-minute">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i * 5).map((min) => (
                          <SelectItem key={min} value={min.toString().padStart(2, '0')}>
                            {min.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="reactionNotes" className="block text-sm font-medium text-foreground mb-2">
              Additional Notes
            </Label>
            <Textarea
              id="reactionNotes"
              rows={3}
              placeholder="Describe the reaction in detail..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              data-testid="textarea-reaction-notes"
            />
          </div>

          {/* Emergency Notice */}
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive-foreground">
                <p className="font-semibold mb-1">Severe reactions require immediate medical attention</p>
                <p>Call emergency services if your baby has difficulty breathing, severe swelling, or loss of consciousness.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleClose} 
              className="flex-1"
              disabled={logReactionMutation.isPending}
              data-testid="button-cancel-reaction"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              className="flex-1"
              disabled={logReactionMutation.isPending}
              data-testid="button-log-reaction"
            >
              {logReactionMutation.isPending ? "Logging..." : "Log Reaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
