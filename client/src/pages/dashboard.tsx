import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import FoodCard from "@/components/food-card";
import AddFoodModal from "@/components/add-food-modal";
import ReactionModal from "@/components/reaction-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Clock, Check, AlertTriangle } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";

interface DashboardData {
  stats: { totalFoods: number; safeFoods: number; foodAllergies: number };
  activeTrials: Array<{
    id: string;
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
  const [reactionModalData, setReactionModalData] = useState<{
    isOpen: boolean;
    trialId: string;
    foodName: string;
    foodEmoji?: string;
  }>({ isOpen: false, trialId: "", foodName: "" });

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

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="dashboard-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        data-testid="dashboard-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Section */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2" data-testid="text-welcome">
            Welcome back!
          </h2>
          <p className="text-muted-foreground">Track your baby's food journey with confidence</p>
        </section>

        {/* Stats Overview */}
        <section className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card" data-testid="card-stats-foods">
            <div className="text-sm opacity-90 mb-1">Foods Tracked</div>
            <div className="text-3xl font-bold">
              {dashboardData?.stats.totalFoods || 0}
            </div>
          </div>
          <div className="stat-card" data-testid="card-stats-safe">
            <div className="text-sm opacity-90 mb-1">Safe Foods</div>
            <div className="text-3xl font-bold text-green-600">
              {dashboardData?.stats.safeFoods || 0}
            </div>
          </div>
          <div className="stat-card" data-testid="card-stats-allergies">
            <div className="text-sm opacity-90 mb-1">Food Allergies</div>
            <div className="text-3xl font-bold text-red-600">
              {dashboardData?.stats.foodAllergies || 0}
            </div>
          </div>
        </section>

        {/* Active Trials Alert */}
        {dashboardData?.activeTrials && dashboardData.activeTrials.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6 flex items-start gap-3" data-testid="alert-active-trials">
            <Clock className="text-accent text-lg mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-accent-foreground mb-1">Active Observation</h3>
              {dashboardData.activeTrials.map((trial) => (
                <div key={trial.id} className="mb-2 last:mb-0">
                  <p className="text-sm text-accent-foreground/80 mb-2">
                    {trial.food.emoji} {trial.food.name} trial ends {formatAustralianDate(new Date(trial.observationEndsAt), "relative")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
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
                      onClick={() => setReactionModalData({
                        isOpen: true,
                        trialId: trial.id,
                        foodName: trial.food.name,
                        foodEmoji: trial.food.emoji,
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

        {/* Food Brick Chart Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Food Progress</h3>
            <Button variant="ghost" size="sm" data-testid="button-view-all-foods">
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashboardData?.foodProgress.map((foodData) => (
              <FoodCard
                key={foodData.food.id}
                food={foodData.food}
                bricks={foodData.bricks}
                passCount={foodData.passCount}
                reactionCount={foodData.reactionCount}
                lastTrial={foodData.lastTrial ? new Date(foodData.lastTrial) : null}
                data-testid={`card-food-${foodData.food.id}`}
              />
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h3>
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
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === "success" ? "bg-success/10" :
                          activity.type === "error" ? "bg-destructive/10" : "bg-accent/10"
                        }`}>
                          {activity.type === "success" ? (
                            <Check className={`h-5 w-5 text-success`} />
                          ) : activity.type === "error" ? (
                            <AlertTriangle className={`h-5 w-5 text-destructive`} />
                          ) : (
                            <Clock className={`h-5 w-5 text-accent`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
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
      </main>

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={() => setIsAddFoodOpen(true)}
        data-testid="button-add-food"
      >
        <Plus className="w-6 h-6" />
      </button>

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
      />
    </div>
  );
}
