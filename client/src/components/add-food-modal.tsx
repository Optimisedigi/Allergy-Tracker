import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, X } from "lucide-react";
import { formatAustralianDateTime } from "@/lib/date-utils";

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string;
}

interface Food {
  id: string;
  name: string;
  emoji?: string;
  category?: string;
  isCommon?: boolean;
}

const COMMON_FOODS = [
  { name: "Milk", emoji: "🥛", category: "dairy" },
  { name: "Egg", emoji: "🥚", category: "protein" },
  { name: "Wheat", emoji: "🌾", category: "grain" },
  { name: "Peanut", emoji: "🥜", category: "protein" },
  { name: "Shellfish", emoji: "🦐", category: "protein" },
  { name: "Fish", emoji: "🐟", category: "protein" },
  { name: "Soy", emoji: "🫘", category: "protein" },
  { name: "Tree Nuts", emoji: "🌰", category: "protein" },
  { name: "Sesame", emoji: "🫴", category: "grain" },
];

export default function AddFoodModal({ isOpen, onClose, babyId }: AddFoodModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [customFoodName, setCustomFoodName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [trialDate, setTrialDate] = useState(formatAustralianDateTime(new Date(), "date"));
  const [trialTime, setTrialTime] = useState(formatAustralianDateTime(new Date(), "time"));
  const [observationPeriod, setObservationPeriod] = useState("3");
  const [notes, setNotes] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get user settings for default observation period
  const { data: userSettings } = useQuery<{ defaultObservationPeriod: number }>({
    queryKey: ["/api/settings"],
    retry: false,
  });

  // Update default observation period when settings load
  useEffect(() => {
    if (userSettings?.defaultObservationPeriod) {
      setObservationPeriod(userSettings.defaultObservationPeriod.toString());
    }
  }, [userSettings]);

  // Create food mutation
  const createFoodMutation = useMutation({
    mutationFn: async (foodData: { name: string; emoji?: string; category?: string }) => {
      const response = await apiRequest("POST", "/api/foods", foodData);
      return response.json();
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
        description: "Failed to create food",
        variant: "destructive",
      });
    },
  });

  // Create trial mutation
  const createTrialMutation = useMutation({
    mutationFn: async (trialData: {
      babyId: string;
      foodId: string;
      trialDate: string;
      observationPeriodDays: number;
      notes?: string;
    }) => {
      const response = await apiRequest("POST", "/api/trials", trialData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success!",
        description: "Food trial started successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
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
      
      // Parse error message (format: "statusCode: {message: '...', details: '...'}")
      let errorMessage = "Failed to start food trial";
      try {
        const errorStr = error.message || "";
        const jsonMatch = errorStr.match(/\d+:\s*({.*})/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (e) {
        // Use default message
      }
      
      toast({
        title: "Cannot Start Trial",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedFood(null);
    setCustomFoodName("");
    setSearchTerm("");
    setTrialDate(formatAustralianDateTime(new Date(), "date"));
    setTrialTime(formatAustralianDateTime(new Date(), "time"));
    setObservationPeriod((userSettings?.defaultObservationPeriod?.toString() || "3"));
    setNotes("");
    setShowCustomInput(false);
    onClose();
  };

  const handleFoodSelect = (food: typeof COMMON_FOODS[0]) => {
    setSelectedFood({
      id: "", // Will be created
      name: food.name,
      emoji: food.emoji,
      category: food.category,
    });
    setSearchTerm(food.name);
    setShowCustomInput(false);
  };

  const handleCustomFood = () => {
    setShowCustomInput(true);
    setSelectedFood(null);
    setSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!babyId) {
      toast({
        title: "Error",
        description: "No baby selected",
        variant: "destructive",
      });
      return;
    }

    let foodToUse = selectedFood;

    // Create custom food if needed
    if (showCustomInput && customFoodName.trim()) {
      const newFood = await createFoodMutation.mutateAsync({
        name: customFoodName.trim(),
        emoji: "🍼",
        category: "other",
      });
      foodToUse = newFood;
    } else if (selectedFood && !selectedFood.id) {
      // Selected food doesn't have an ID yet, create it
      const newFood = await createFoodMutation.mutateAsync({
        name: selectedFood.name,
        emoji: selectedFood.emoji || "🍼",
        category: selectedFood.category || "other",
      });
      foodToUse = newFood;
    } else if (!selectedFood && searchTerm.trim()) {
      // Create food from search term
      const matchingCommonFood = COMMON_FOODS.find(f => 
        f.name.toLowerCase() === searchTerm.toLowerCase()
      );
      
      const newFood = await createFoodMutation.mutateAsync({
        name: searchTerm.trim(),
        emoji: matchingCommonFood?.emoji || "🍼",
        category: matchingCommonFood?.category || "other",
      });
      foodToUse = newFood;
    }

    if (!foodToUse || !foodToUse.id) {
      toast({
        title: "Error",
        description: "Please select or enter a food name",
        variant: "destructive",
      });
      return;
    }

    // Create trial
    const trialDateTime = new Date(`${trialDate}T${trialTime}`);
    
    createTrialMutation.mutate({
      babyId,
      foodId: foodToUse.id,
      trialDate: trialDateTime.toISOString(),
      observationPeriodDays: parseInt(observationPeriod),
      notes: notes.trim() || undefined,
    });
  };

  const filteredFoods = COMMON_FOODS.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = createFoodMutation.isPending || createTrialMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-add-food">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add Food Trial
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-add-food">
          {/* Food Selection */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">
              Select Food
            </Label>
            
            {!showCustomInput && (
              <div className="search-input mb-3">
                <Search className="search-icon w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search common foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-food-search"
                />
              </div>
            )}

            {showCustomInput ? (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Enter custom food name..."
                  value={customFoodName}
                  onChange={(e) => setCustomFoodName(e.target.value)}
                  data-testid="input-custom-food"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCustomInput(false)}
                  data-testid="button-back-to-common"
                >
                  Back to Common Foods
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {filteredFoods.slice(0, 6).map((food) => (
                    <button
                      key={food.name}
                      type="button"
                      onClick={() => handleFoodSelect(food)}
                      className={`p-3 border rounded-lg transition-all text-center ${
                        selectedFood?.name === food.name
                          ? "bg-primary/10 border-primary"
                          : "bg-muted hover:bg-primary/5 border-border hover:border-primary"
                      }`}
                      data-testid={`button-food-${food.name.toLowerCase()}`}
                    >
                      <span className="text-2xl block mb-1">{food.emoji}</span>
                      <span className="text-xs font-medium">{food.name}</span>
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCustomFood}
                  className="w-full"
                  data-testid="button-add-custom-food"
                >
                  + Add Custom Food
                </Button>
              </>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trialDate" className="block text-sm font-medium text-foreground mb-2">
                Date
              </Label>
              <Input
                id="trialDate"
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                required
                data-testid="input-trial-date"
              />
            </div>
            <div>
              <Label htmlFor="trialTime" className="block text-sm font-medium text-foreground mb-2">
                Time
              </Label>
              <Input
                id="trialTime"
                type="time"
                value={trialTime}
                onChange={(e) => setTrialTime(e.target.value)}
                required
                data-testid="input-trial-time"
              />
            </div>
          </div>

          {/* Observation Period */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">
              Observation Period
            </Label>
            <Select value={observationPeriod} onValueChange={setObservationPeriod}>
              <SelectTrigger data-testid="select-observation-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days (default)</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Add any observations or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              data-testid="textarea-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleClose} 
              className="flex-1"
              disabled={isLoading}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
              data-testid="button-start-trial"
            >
              {isLoading ? "Starting..." : "Start Trial"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
