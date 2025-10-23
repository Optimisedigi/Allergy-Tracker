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
import { X, AlertTriangle, CalendarIcon, Camera } from "lucide-react";
import { formatAustralianDateTime } from "@/lib/date-utils";
import { format } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialId: string;
  foodName: string;
  foodEmoji?: string;
  trialDate?: string;
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
  foodEmoji,
  trialDate 
}: ReactionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [resolvedDate, setResolvedDate] = useState<Date | undefined>(new Date());
  const [resolvedHour, setResolvedHour] = useState<string>(new Date().getHours().toString().padStart(2, '0'));
  const [resolvedMinute, setResolvedMinute] = useState<string>((Math.floor(new Date().getMinutes() / 5) * 5).toString().padStart(2, '0'));
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setSelectedTypes([]);
      setSeverity("mild");
      setResolvedDate(now);
      setResolvedHour(now.getHours().toString().padStart(2, '0'));
      setResolvedMinute((Math.floor(now.getMinutes() / 5) * 5).toString().padStart(2, '0'));
      setNotes("");
      setPhotoUrl("");
      setIsUploadingPhoto(false);
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
      photoUrl?: string;
    }) => {
      const response = await apiRequest("POST", `/api/trials/${trialId}/reactions`, {
        types: reactionData.types,
        severity: reactionData.severity,
        startedAt: new Date(reactionData.startedAt).toISOString(),
        resolvedAt: reactionData.resolvedAt ? new Date(reactionData.resolvedAt).toISOString() : undefined,
        notes: reactionData.notes,
        photoUrl: reactionData.photoUrl,
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

  // Delete trial mutation
  const deleteTrialMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/trials/${trialId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Trial Deleted",
        description: "Food trial has been removed successfully",
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
        description: "Failed to delete trial",
        variant: "destructive",
      });
    },
  });

  // Photo upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFileURL = result.successful[0].uploadURL;
      
      setIsUploadingPhoto(true);
      try {
        // Set ACL policy for the uploaded photo
        const response = await apiRequest("PUT", "/api/reaction-photos", {
          photoURL: uploadedFileURL,
        });
        const data = await response.json();
        setPhotoUrl(data.objectPath);
        toast({
          title: "Photo Uploaded",
          description: "Photo has been attached to the reaction",
        });
      } catch (error) {
        console.error("Error setting photo ACL:", error);
        toast({
          title: "Error",
          description: "Failed to attach photo",
          variant: "destructive",
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleClose = () => {
    const now = new Date();
    setSelectedTypes([]);
    setSeverity("mild");
    setResolvedDate(now);
    setResolvedHour(now.getHours().toString().padStart(2, '0'));
    setResolvedMinute((Math.floor(now.getMinutes() / 5) * 5).toString().padStart(2, '0'));
    setNotes("");
    setPhotoUrl("");
    setIsUploadingPhoto(false);
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

    if (!resolvedDate) {
      toast({
        title: "Time of Reaction Required", 
        description: "Please specify when the reaction occurred",
        variant: "destructive",
      });
      return;
    }

    // Use trial date as the start time
    const startedAtString = trialDate || new Date().toISOString().slice(0, 16);

    // Combine resolved date and time
    const resolved = new Date(resolvedDate);
    resolved.setHours(parseInt(resolvedHour), parseInt(resolvedMinute), 0, 0);
    const resolvedAtString = resolved.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm

    logReactionMutation.mutate({
      types: selectedTypes,
      severity,
      startedAt: startedAtString,
      resolvedAt: resolvedAtString,
      notes: notes.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    });
  };

  if (!trialId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4" data-testid="modal-reaction">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Log Reaction to</DialogTitle>
        </DialogHeader>

        {/* Food Name Display */}
        <div className="p-1 bg-muted/50 rounded-lg mb-1" data-testid="reaction-food-info">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">{foodEmoji || "🍼"}</span>
            <div>
              <p className="font-semibold text-lg text-foreground">{foodName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-log-reaction">
          {/* Reaction Type */}
          <div>
            <Label className="block text-xs font-medium text-foreground mb-1">
              Reaction Type *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {REACTION_TYPES.map((type) => (
                <label 
                  key={type}
                  className="relative flex items-center p-1.5 bg-muted border border-border rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary transition-all"
                >
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => handleTypeToggle(type, checked as boolean)}
                    className="mr-1.5"
                    data-testid={`checkbox-reaction-${type}`}
                  />
                  <span className="text-xs capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <Label className="block text-xs font-medium text-foreground mb-1">
              Severity *
            </Label>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSeverity(level.value)}
                  className={`flex-1 p-1.5 text-center border-2 rounded-lg cursor-pointer transition-all ${
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
                  <p className="font-medium text-xs">{level.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-2">
            {/* Food trial started on (read-only) */}
            <div>
              <Label className="block text-xs font-medium text-foreground mb-1">
                Food trial started on
              </Label>
              <div className="p-1.5 bg-muted/50 border border-border rounded-md text-xs text-foreground">
                {trialDate ? format(new Date(trialDate), "PPP 'at' HH:mm") : "Not available"}
              </div>
            </div>
            
            {/* Time of reaction */}
            <div>
              <Label className="block text-xs font-medium text-foreground mb-1">
                Time of reaction *
              </Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-8 text-xs"
                      data-testid="button-resolved-date"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
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
                      <SelectTrigger className="h-8 text-xs" data-testid="select-resolved-hour">
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
                      <SelectTrigger className="h-8 text-xs" data-testid="select-resolved-minute">
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
            <Label htmlFor="reactionNotes" className="block text-xs font-medium text-foreground mb-1">
              Additional Notes
            </Label>
            <Textarea
              id="reactionNotes"
              rows={2}
              placeholder="Describe the reaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none text-xs"
              data-testid="textarea-reaction-notes"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="block text-xs font-medium text-foreground mb-1">
              Attach Photo (optional)
            </Label>
            <div className="flex items-center gap-2">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handlePhotoUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center gap-2 text-xs">
                  <Camera className="w-3 h-3" />
                  <span>{photoUrl ? "Change Photo" : "Upload Photo"}</span>
                </div>
              </ObjectUploader>
              {photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhotoUrl("")}
                  className="text-destructive hover:text-destructive"
                  data-testid="button-remove-photo"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {photoUrl && (
              <p className="text-xs text-success mt-1">
                ✓ Photo attached
              </p>
            )}
            {isUploadingPhoto && (
              <p className="text-xs text-muted-foreground mt-1">
                Processing photo...
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleClose} 
              className="flex-1 h-8 text-xs"
              disabled={logReactionMutation.isPending}
              data-testid="button-cancel-reaction"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              className="flex-1 h-8 text-xs"
              disabled={logReactionMutation.isPending}
              data-testid="button-log-reaction"
            >
              {logReactionMutation.isPending ? "Logging..." : "Log Reaction"}
            </Button>
          </div>

          {/* Emergency Notice */}
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex gap-1.5">
              <AlertTriangle className="text-destructive mt-0.5 flex-shrink-0 w-3 h-3" />
              <div className="text-[0.65rem] text-black dark:text-destructive-foreground leading-tight">
                <p className="font-semibold">Severe reactions require immediate medical attention</p>
                <p className="mt-0.5">Call emergency services if your baby has difficulty breathing, severe swelling, or loss of consciousness.</p>
              </div>
            </div>
          </div>

          {/* Delete Trial Button */}
          <div className="pt-2 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => deleteTrialMutation.mutate()}
              className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
              disabled={deleteTrialMutation.isPending}
              data-testid="button-delete-trial"
            >
              {deleteTrialMutation.isPending ? "Deleting..." : "Delete Trial"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
