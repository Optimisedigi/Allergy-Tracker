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
import { Search, Plus, X } from "lucide-react";
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

  // Fetch all foods from database
  const { data: allFoods = [] } = useQuery<Food[]>({
    queryKey: ["/api/foods"],
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foods"] });
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

  // Delete food mutation
  const deleteFoodMutation = useMutation({
    mutationFn: async (foodId: string) => {
      const response = await apiRequest("DELETE", `/api/foods/${foodId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foods"] });
      toast({
        title: "Food Deleted",
        description: "Custom food has been removed",
      });
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
      toast({
        title: "Cannot Delete",
        description: "This food has existing trials and cannot be deleted",
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

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setSearchTerm(food.name);
    setShowCustomInput(false);
  };

  const handleCustomFood = () => {
    setShowCustomInput(true);
    setSelectedFood(null);
    setSearchTerm("");
  };

  const toSentenceCase = (text: string): string => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const handleAddCustomFood = async () => {
    if (!customFoodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a food name",
        variant: "destructive",
      });
      return;
    }

    try {
      const formattedName = toSentenceCase(customFoodName.trim());
      const newFood = await createFoodMutation.mutateAsync({
        name: formattedName,
        emoji: "🍼",
        category: "other",
      });
      setSelectedFood(newFood);
      setSearchTerm(newFood.name);
      setShowCustomInput(false);
      setCustomFoodName("");
      toast({
        title: "Food Added",
        description: `${newFood.name} has been added to your food list`,
      });
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Don't submit form, just filter the results
    }
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomFood();
    }
  };

  // Fetch food history when a food is selected
  const { data: foodHistory } = useQuery<{
    redBrickCount: number;
    reactionsInLastThreeTrials: number;
    highestSeverity: 'mild' | 'moderate' | 'severe' | null;
    hasConsecutiveRedBricks: boolean;
  }>({
    queryKey: ["/api/babies", babyId, "foods", selectedFood?.id, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/babies/${babyId}/foods/${selectedFood?.id}/history`);
      if (!response.ok) throw new Error("Failed to fetch food history");
      return response.json();
    },
    enabled: isOpen && !!babyId && !!selectedFood,
  });

  // Fetch active steroid cream status
  const { data: activeCream } = useQuery<{
    id: string;
    startedAt: string;
    durationDays: number;
  } | null>({
    queryKey: ["/api/babies", babyId, "steroid-cream", "active"],
    queryFn: async () => {
      const response = await fetch(`/api/babies/${babyId}/steroid-cream/active`);
      if (!response.ok) throw new Error("Failed to fetch steroid cream status");
      return response.json();
    },
    enabled: isOpen && !!babyId,
  });

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

    if (!selectedFood) {
      toast({
        title: "Error",
        description: "Please select a food before starting a trial",
        variant: "destructive",
      });
      return;
    }

    // Check if steroid cream is active
    if (activeCream) {
      const confirmed = window.confirm(
        `⚠️ STEROID CREAM WARNING:\n\nSteroid cream is currently active and can suppress allergic reactions, making allergy testing unreliable.\n\n` +
        `It is recommended to wait 2 weeks after stopping steroid cream before introducing new foods.\n\nAre you sure you want to proceed with this food trial?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Check if food has existing reactions and show appropriate notification
    if (foodHistory) {
      const { hasConsecutiveRedBricks, reactionsInLastThreeTrials, highestSeverity } = foodHistory;
      
      // Scenario 2: Confirmed or likely allergy (3 consecutive red bricks OR moderate/severe reaction)
      if (hasConsecutiveRedBricks || highestSeverity === 'moderate' || highestSeverity === 'severe') {
        const severityText = highestSeverity === 'moderate' ? 'moderate' : highestSeverity === 'severe' ? 'severe' : 'mild';
        const confirmed = window.confirm(
          `🚫 Important: ${selectedFood.name} has previously caused a ${severityText} allergic reaction.\n\n` +
          `Re-introducing this food could trigger another reaction. Please monitor your child carefully for any signs of allergy.\n` +
          `If the past reaction was moderate or severe, consider reintroducing this food under the guidance or supervision of your paediatrician or allergist.\n\n` +
          `Do you still wish to continue?`
        );
        if (!confirmed) {
          return;
        }
      }
      // Scenario 1: Recent mild reaction (1+ reaction in past 3 trials, not confirmed allergy)
      else if (reactionsInLastThreeTrials > 0 && !hasConsecutiveRedBricks) {
        const confirmed = window.confirm(
          `⚠️ Note: ${selectedFood.name} previously caused a mild reaction.\n\n` +
          `You can reintroduce this food, but keep an eye out for any symptoms.\n` +
          `If you're unsure, check in with your paediatrician for guidance.\n\n` +
          `Are you happy to continue with this food?`
        );
        if (!confirmed) {
          return;
        }
      }
    }

    // Create trial
    const trialDateTime = new Date(`${trialDate}T${trialTime}`);
    
    createTrialMutation.mutate({
      babyId,
      foodId: selectedFood.id,
      trialDate: trialDateTime.toISOString(),
      observationPeriodDays: parseInt(observationPeriod),
      notes: notes.trim() || undefined,
    });
  };

  // Filter and organize foods by category
  const filteredFoods = allFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group foods by category
  const categoryOrder = ['protein', 'dairy', 'vegetable', 'fruit', 'grain', 'legume', 'other'];
  const categoryLabels: Record<string, string> = {
    protein: 'Proteins',
    dairy: 'Dairy',
    vegetable: 'Vegetables',
    fruit: 'Fruits',
    grain: 'Grains & Cereals',
    legume: 'Legumes',
    other: 'Other'
  };

  const foodsByCategory = filteredFoods.reduce((acc, food) => {
    const category = food.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(food);
    return acc;
  }, {} as Record<string, Food[]>);

  // Sort foods within each category alphabetically
  Object.keys(foodsByCategory).forEach(category => {
    foodsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  const isLoading = createFoodMutation.isPending || createTrialMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-add-food">
        <DialogHeader>
          <DialogTitle>
            Add Food Trial
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-add-food">
          {/* Food Selection */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">
              Select Food {selectedFood && <span className="text-primary">✓ {selectedFood.name} selected</span>}
            </Label>
            
            {!showCustomInput && (
              <div className="search-input mb-3">
                <Search className="search-icon w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
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
                  onKeyDown={handleCustomInputKeyDown}
                  data-testid="input-custom-food"
                />
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCustomInput(false)}
                    className="flex-1"
                    data-testid="button-back-to-common"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    variant="default" 
                    size="sm"
                    onClick={handleAddCustomFood}
                    disabled={!customFoodName.trim() || createFoodMutation.isPending}
                    className="flex-1"
                    data-testid="button-confirm-custom-food"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {createFoodMutation.isPending ? "Adding..." : "Add Food"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-[350px] overflow-y-auto space-y-4 mb-3">
                  {filteredFoods.length > 0 ? (
                    categoryOrder.map(category => {
                      const foods = foodsByCategory[category];
                      if (!foods || foods.length === 0) return null;
                      
                      return (
                        <div key={category}>
                          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                            {categoryLabels[category]}
                          </h3>
                          <div className="grid grid-cols-3 gap-2">
                            {foods.map((food) => (
                              <button
                                key={food.id}
                                type="button"
                                onClick={() => handleFoodSelect(food)}
                                className={`p-3 border rounded-lg transition-all text-center ${
                                  selectedFood?.id === food.id
                                    ? "bg-primary/10 border-primary"
                                    : "bg-muted hover:bg-primary/5 border-border hover:border-primary"
                                }`}
                                data-testid={`button-food-${food.name.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <span className="text-2xl block mb-1">{food.emoji || "🍼"}</span>
                                <span className="text-xs font-medium">{food.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No foods found
                    </div>
                  )}
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
              disabled={isLoading || !selectedFood}
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
