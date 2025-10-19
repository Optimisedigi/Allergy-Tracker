import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import FoodDetailModal from "@/components/food-detail-modal";
import AddFoodModal from "@/components/add-food-modal";
import SteroidCreamModal from "@/components/steroid-cream-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Utensils, CheckCircle, CircleAlert, Check, AlertTriangle, X, Copy, Plus, Droplet } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";

interface ReportsData {
  stats: { totalFoods: number; safePasses: number };
  activeTrials: Array<{
    id: string;
    foodId: string;
    status: string;
    food: { id: string; name: string; emoji?: string };
  }>;
  foodProgress: Array<{
    food: { id: string; name: string; emoji?: string };
    bricks: Array<{ type: string; date: string }>;
    passCount: number;
    reactionCount: number;
    lastTrial: string | null;
    firstTrial: string | null;
  }>;
}

export default function Reports() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [selectedFood, setSelectedFood] = useState<{ id: string; name: string; emoji?: string } | null>(null);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isSteroidCreamOpen, setIsSteroidCreamOpen] = useState(false);

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

  // Get dashboard data for reports
  const { data: reportsData, isLoading: isReportsLoading } = useQuery<ReportsData>({
    queryKey: ["/api/dashboard", selectedBaby],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  if (isLoading || isReportsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
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
    if (!reportsData?.foodProgress) return 0;
    
    const reactionDates: Date[] = [];
    
    // Find all reaction dates from all food bricks
    reportsData.foodProgress.forEach(food => {
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
    const hasActiveTrial = reportsData?.activeTrials?.some(trial => trial.foodId === foodId);
    
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
      return hasActiveTrial ? "Confirmed allergy but testing again" : "Confirmed allergy";
    }
    
    // Check for safe food with past reactions (3 consecutive safe bricks but has reactions in history)
    if (hasConsecutiveSafeBricks && reactions > 0) {
      return "Safe food, but signs of sensitivity";
    }
    
    // Safe food (3+ passes, no reactions)
    if (passes >= 3 && reactions === 0) {
      return hasActiveTrial ? "Food is safe but testing again" : "Safe food";
    }
    
    // No trials yet
    if (passes === 0 && reactions === 0) return "Not tried yet";
    
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
      case "Food is safe but testing again":
        return { icon: <Check className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" };
      case "Safe food, but signs of sensitivity":
      case "Caution":
      case "Possible sensitivity":
        return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-500", bg: "bg-orange-500/10" };
      case "Likely allergy":
      case "Allergy suspected":
      case "Confirmed allergy":
      case "Confirmed allergy but testing again":
        return { icon: <X className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/10" };
      case "Building confidence":
      case "Passed once":
        return { icon: <Check className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" };
      default:
        return { icon: null, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const reactionCount = reportsData?.foodProgress.reduce((sum, food) => sum + food.reactionCount, 0) || 0;
  const safeCount = reportsData?.foodProgress.filter(food => food.reactionCount === 0 && food.passCount > 0).length || 0;

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="reports-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        daysWithoutReaction={daysWithoutReaction}
        data-testid="reports-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-reports-title">
            Food Reports
          </h2>
          <Button 
            className="flex items-center gap-2 print:hidden"
            onClick={() => window.print()}
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export PDF</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card data-testid="card-summary-total">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Total Foods Tested</p>
                <Utensils className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {reportsData?.stats.totalFoods || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-safe">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Food test passed</p>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-xl font-bold text-success">{safeCount}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-reactions">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Reactions Logged</p>
                <CircleAlert className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-xl font-bold text-destructive">{reactionCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Food Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Detailed Food History</h3>
            </div>
            
            {reportsData?.foodProgress.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No food trials recorded yet. Start tracking to see reports here!
              </div>
            ) : (
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
                    {reportsData?.foodProgress.map((foodData) => {
                      // Calculate total passes and reactions for final status
                      const passes = foodData.bricks.filter(b => b.type === 'safe').length;
                      const reactions = foodData.bricks.filter(b => b.type === 'reaction' || b.type === 'warning').length;
                      const status = getStatus(passes, reactions, foodData.bricks, foodData.food.id);
                      const statusDisplay = getStatusDisplay(status);

                      return (
                        <tr 
                          key={foodData.food.id} 
                          className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 cursor-pointer"
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
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Report Section */}
        <Card className="mt-6 print:hidden">
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
      </main>

      {/* Floating Action Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="fab" 
            data-testid="button-add-menu"
          >
            <Plus className="w-6 h-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mb-2" data-testid="menu-add-options">
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

      {/* Mobile Navigation */}
      <MobileNav activeTab="reports" />

      {/* Modals */}
      <AddFoodModal
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        babyId={selectedBaby}
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
    </div>
  );
}
