import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import FoodDetailModal from "@/components/food-detail-modal";
import AddFoodModal from "@/components/add-food-modal";
import ReactionModal from "@/components/reaction-modal";
import SteroidCreamModal from "@/components/steroid-cream-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Clock, Check, AlertTriangle, Droplet, Utensils, CheckCircle, CircleAlert, X } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";

interface DashboardData {
  stats: { totalFoods: number; safeFoods: number; foodAllergies: number };
  activeTrials: Array<{
    id: string;
    trialDate: string;
    observationEndsAt: string;
    food: { name: string; emoji?: string };
  }>;
  recentActivity: Array<{
    id: string;
    description: string;
    timestamp: string;
    type: string;
  }>;
  foodProgress: Array<{
    food: { id: string; name: string; emoji?: string };
    bricks: Array<{ type: string; date: string }>;
    passCount: number;
    reactionCount: number;
    lastTrial: string | null;
  }>;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isSteroidCreamOpen, setIsSteroidCreamOpen] = useState(false);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [selectedFood, setSelectedFood] = useState<{ id: string; name: string; emoji?: string } | null>(null);
  const [reactionModalData, setReactionModalData] = useState<{
    isOpen: boolean;
    trialId: string;
    foodName: string;
    foodEmoji?: string;
    trialDate?: string;
  }>({ isOpen: false, trialId: "", foodName: "" });
  const [deleteDialogData, setDeleteDialogData] = useState<{
    isOpen: boolean;
    foodId: string;
    foodName: string;
  }>({ isOpen: false, foodId: "", foodName: "" });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Get user's babies
  const { data: babies = [] } = useQuery<Array<{ id: string; name: string; dateOfBirth: string; gender: string }>>({
    queryKey: ["/api/babies"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Set first baby as selected by default
  useEffect(() => {
    if (babies.length > 0 && !selectedBaby) {
      setSelectedBaby(babies[0].id);
    }
  }, [babies, selectedBaby]);

  // Get dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", selectedBaby],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

  // Get active steroid cream status
  const { data: activeCream } = useQuery<{
    id: string;
    startedAt: string;
    durationDays: number;
  } | null>({
    queryKey: ["/api/babies", selectedBaby, "steroid-cream", "active"],
    queryFn: async () => {
      const response = await fetch(`/api/babies/${selectedBaby}/steroid-cream/active`);
      if (!response.ok) throw new Error("Failed to fetch steroid cream status");
      return response.json();
    },
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

  const queryClient = useQueryClient();

  // Complete trial mutation
  const completeTrialMutation = useMutation({
    mutationFn: async (trialId: string) => {
      await apiRequest("PATCH", `/api/trials/${trialId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success!",
        description: "Trial completed successfully",
      });
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
        description: "Failed to complete trial",
        variant: "destructive",
      });
    },
  });

  // Delete single trial mutation
  const deleteSingleTrialMutation = useMutation({
    mutationFn: async ({ babyId, foodId }: { babyId: string; foodId: string }) => {
      await apiRequest("DELETE", `/api/babies/${babyId}/foods/${foodId}/latest-trial`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeleteDialogData({ isOpen: false, foodId: "", foodName: "" });
      toast({
        title: "Trial Deleted",
        description: "The most recent trial has been removed",
      });
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

  // Delete food progress mutation
  const deleteFoodProgressMutation = useMutation({
    mutationFn: async ({ babyId, foodId }: { babyId: string; foodId: string }) => {
      await apiRequest("DELETE", `/api/babies/${babyId}/foods/${foodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeleteDialogData({ isOpen: false, foodId: "", foodName: "" });
      toast({
        title: "Food Progress Deleted",
        description: "All trials for this food have been removed",
      });
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
        description: "Failed to delete food progress",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isDashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedBabyData = babies.find((b) => b.id === selectedBaby);

  // Calculate days without reaction
  const calculateDaysWithoutReaction = (): number => {
    if (!dashboardData?.foodProgress) return 0;
    
    const reactionDates: Date[] = [];
    
    // Find all reaction dates from all food bricks
    dashboardData.foodProgress.forEach(food => {
      food.bricks.forEach(brick => {
        if (brick.type === 'reaction' || brick.type === 'warning') {
          reactionDates.push(new Date(brick.date));
        }
      });
    });
    
    // If no reactions found, return 0
    if (reactionDates.length === 0) return 0;
    
    // Find the most recent reaction
    const mostRecentReactionDate = new Date(Math.max(...reactionDates.map(d => d.getTime())));
    
    // Calculate days difference
    const today = new Date();
    const diffTime = today.getTime() - mostRecentReactionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysWithoutReaction = calculateDaysWithoutReaction();

  const handleSendReport = async () => {
    if (!doctorEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", `/api/babies/${selectedBaby}/send-report`, {
        email: doctorEmail,
      });

      if (response.ok) {
        toast({
          title: "Report Sent",
          description: `Food report has been sent to ${doctorEmail}`,
        });
        setDoctorEmail("");
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Send",
          description: error.message || "Could not send report",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending report:", error);
      toast({
        title: "Error",
        description: "Failed to send report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate status based on passes, reactions, bricks, and active trials
  const getStatus = (passes: number, reactions: number, bricks: Array<{ type: string; date: string }>, foodId: string) => {
    // Check if there's an active trial for this food
    const hasActiveTrial = dashboardData?.activeTrials?.some(trial => trial.food.name === dashboardData.foodProgress.find(f => f.food.id === foodId)?.food.name);
    
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
      return hasActiveTrial ? "Confirmed allergy but re-testing" : "Confirmed allergy";
    }
    
    // Check for safe food with past reactions (3 consecutive safe bricks but has reactions in history)
    if (hasConsecutiveSafeBricks && reactions > 0) {
      return "Safe food, but signs of sensitivity";
    }
    
    // Safe food (3+ passes, no reactions)
    if (passes >= 3 && reactions === 0) {
      return hasActiveTrial ? "Food is safe but re-testing" : "Safe food";
    }
    
    // No trials yet
    if (passes === 0 && reactions === 0) return "Under observation";
    
    // Early stage passes
    if (passes === 1 && reactions === 0) return "Passed once";
    if (passes === 2 && reactions === 0) return "Building confidence";
    
    // 3+ passes with reactions
    if (passes >= 3 && reactions === 1) return "Caution";
    if (passes >= 3 && reactions >= 2) return "Likely allergy";
    
    // Less than 3 passes with reactions
    if (passes < 3 && reactions === 1) return "Possible sensitivity";
    if (passes < 3 && reactions >= 2) return "Allergy suspected";
    
    return "Testing";
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "Safe food":
      case "Food is safe but re-testing":
        return { icon: <Check className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" };
      case "Safe food, but signs of sensitivity":
      case "Caution":
      case "Possible sensitivity":
        return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-500", bg: "bg-orange-500/10" };
      case "Likely allergy":
      case "Allergy suspected":
      case "Confirmed allergy":
      case "Confirmed allergy but re-testing":
        return { icon: <X className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/10" };
      case "Building confidence":
      case "Passed once":
        return { icon: <Check className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" };
      default:
        return { icon: null, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="dashboard-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        daysWithoutReaction={daysWithoutReaction}
        data-testid="dashboard-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <section className="grid grid-cols-3 gap-3 mb-4">
          <Card data-testid="card-stats-foods">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Foods Tracked</p>
                <Utensils className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {dashboardData?.stats.totalFoods || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-safe">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Foods that are safe</p>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">
                {dashboardData?.stats.safeFoods || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-allergies">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Food Allergies</p>
                <CircleAlert className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">
                {dashboardData?.stats.foodAllergies || 0}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Steroid Cream Alert */}
        {activeCream && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 flex items-start gap-3" data-testid="alert-steroid-cream">
            <Droplet className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Steroid Cream Active</h3>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {activeCream.durationDays}-day treatment in progress.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSteroidCreamOpen(true)}
              className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              data-testid="button-manage-cream"
            >
              Manage
            </Button>
          </div>
        )}

        {/* Active Trials Alert */}
        {dashboardData?.activeTrials && dashboardData.activeTrials.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4 flex items-start gap-3" data-testid="alert-active-trials">
            <Clock className="text-accent text-lg mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-accent-foreground mb-1">Active Observation</h3>
              {dashboardData.activeTrials.map((trial) => (
                <div key={trial.id} className="mb-2 last:mb-0">
                  <p className="text-xs text-accent-foreground/80 mb-2">
                    {trial.food.emoji} {trial.food.name} trial ends {formatAustralianDate(new Date(trial.observationEndsAt), "relative")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => completeTrialMutation.mutate(trial.id)}
                      disabled={completeTrialMutation.isPending}
                      data-testid={`button-complete-${trial.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Safe
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      onClick={() => setReactionModalData({
                        isOpen: true,
                        trialId: trial.id,
                        foodName: trial.food.name,
                        foodEmoji: trial.food.emoji,
                        trialDate: trial.trialDate,
                      })}
                      data-testid={`button-reaction-${trial.id}`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Log Reaction
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Food History Table */}
        <section className="mb-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">Detailed Food History</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/20">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-[120px]">Trial</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Visual</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-[200px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const foodProgress = dashboardData?.foodProgress || [];
                      const rows = [];
                      
                      // Add actual food data rows
                      foodProgress.forEach((foodData) => {
                        const passes = foodData.bricks.filter(b => b.type === 'safe').length;
                        const reactions = foodData.bricks.filter(b => b.type === 'reaction' || b.type === 'warning').length;
                        const status = getStatus(passes, reactions, foodData.bricks, foodData.food.id);
                        const statusDisplay = getStatusDisplay(status);

                        rows.push(
                          <tr 
                            key={foodData.food.id} 
                            className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                            onClick={() => setSelectedFood({ id: foodData.food.id, name: foodData.food.name, emoji: foodData.food.emoji })}
                            data-testid={`food-row-${foodData.food.id}`}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{foodData.food.emoji || "🍼"}</span>
                                <span className="font-medium text-xs">{foodData.food.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-0.5">
                                {[...foodData.bricks].reverse().slice(0, 6).map((brick, brickIdx) => (
                                  <div
                                    key={brickIdx}
                                    className={`h-5 rounded`}
                                    style={{
                                      width: '16.8px',
                                      background: brick.type === 'safe' 
                                        ? 'linear-gradient(135deg, hsl(142 52% 65%) 0%, hsl(142 52% 55%) 100%)'
                                        : brick.type === 'warning'
                                        ? 'linear-gradient(135deg, hsl(38 92% 65%) 0%, hsl(38 92% 55%) 100%)'
                                        : 'linear-gradient(135deg, hsl(0 70% 75%) 0%, hsl(0 70% 65%) 100%)'
                                    }}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className={statusDisplay.color}>{statusDisplay.icon}</span>
                                <span className="text-xs">{status}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                      
                      // Add empty rows to make total 4 data rows
                      const emptyRowsCount = Math.max(0, 4 - foodProgress.length);
                      for (let i = 0; i < emptyRowsCount; i++) {
                        rows.push(
                          <tr key={`empty-${i}`} className="border-b border-border/50">
                            <td className="py-2 px-3 h-[42px]">&nbsp;</td>
                            <td className="py-2 px-3">&nbsp;</td>
                            <td className="py-2 px-3">&nbsp;</td>
                          </tr>
                        );
                      }
                      
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Recent Activity</h3>
          <Card>
            <CardContent className="p-0">
              {dashboardData?.recentActivity.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No recent activity. Start by adding a food trial!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {dashboardData?.recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === "success" ? "bg-success/10" :
                          activity.type === "error" ? "bg-destructive/10" : "bg-accent/10"
                        }`}>
                          {activity.type === "success" ? (
                            <Check className={`h-4 w-4 text-success`} />
                          ) : activity.type === "error" ? (
                            <AlertTriangle className={`h-4 w-4 text-destructive`} />
                          ) : (
                            <Clock className={`h-4 w-4 text-accent`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatAustralianDate(new Date(activity.timestamp))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Email Food Report Section */}
        <section className="mb-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Email Food Report</h3>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="doctor@example.com"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-doctor-email"
                />
                <Button 
                  onClick={handleSendReport}
                  className="whitespace-nowrap"
                  data-testid="button-send-report"
                >
                  Send Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Floating Action Button with Dropdown */}
      {!reactionModalData.isOpen && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="fab" 
              data-testid="button-add-menu"
            >
              <Plus className="w-6 h-6" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56 mb-2 shadow-lg border-2" data-testid="menu-add-options">
            <DropdownMenuItem onClick={() => setIsAddFoodOpen(true)} data-testid="menu-item-add-food">
              <Plus className="w-4 h-4 mr-2" />
              Add Food Trial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsSteroidCreamOpen(true)} data-testid="menu-item-steroid-cream">
              <Droplet className="w-4 h-4 mr-2" />
              Track Steroid Cream
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Mobile Navigation */}
      <MobileNav activeTab="home" />

      {/* Modals */}
      <AddFoodModal
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        babyId={selectedBaby}
      />

      <ReactionModal
        isOpen={reactionModalData.isOpen}
        onClose={() => setReactionModalData({ isOpen: false, trialId: "", foodName: "" })}
        trialId={reactionModalData.trialId}
        foodName={reactionModalData.foodName}
        foodEmoji={reactionModalData.foodEmoji}
        trialDate={reactionModalData.trialDate}
      />

      <SteroidCreamModal
        isOpen={isSteroidCreamOpen}
        onClose={() => setIsSteroidCreamOpen(false)}
        babyId={selectedBaby}
      />

      {/* Food Detail Modal */}
      {selectedFood && (
        <FoodDetailModal
          isOpen={!!selectedFood}
          onClose={() => setSelectedFood(null)}
          babyId={selectedBaby}
          foodId={selectedFood.id}
          foodName={selectedFood.name}
          foodEmoji={selectedFood.emoji}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogData.isOpen} onOpenChange={(open) => !open && setDeleteDialogData({ isOpen: false, foodId: "", foodName: "" })}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialogData.foodName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose what you'd like to delete:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => deleteSingleTrialMutation.mutate({ babyId: selectedBaby, foodId: deleteDialogData.foodId })}
              disabled={deleteSingleTrialMutation.isPending}
              data-testid="button-delete-single-trial"
              className="justify-start"
            >
              Delete Latest Trial Only
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteFoodProgressMutation.mutate({ babyId: selectedBaby, foodId: deleteDialogData.foodId })}
              disabled={deleteFoodProgressMutation.isPending}
              data-testid="button-delete-all-progress"
              className="justify-start"
            >
              Delete All Food Progress
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
