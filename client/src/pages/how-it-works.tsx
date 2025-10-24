import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import AddFoodModal from "@/components/add-food-modal";
import SteroidCreamModal from "@/components/steroid-cream-modal";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, AlertTriangle, CircleAlert, Circle, TrendingUp, Plus, Droplet } from "lucide-react";

interface DashboardData {
  foodProgress: Array<{
    food: { id: string; name: string; emoji?: string };
    bricks: Array<{ type: string; date: string }>;
  }>;
}

export default function HowItWorks() {
  const { user, isAuthenticated } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isSteroidCreamOpen, setIsSteroidCreamOpen] = useState(false);

  // Get user's babies
  const { data: babies = [] } = useQuery<Array<{ id: string; name: string }>>({
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
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", selectedBaby],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

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

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="how-it-works-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        daysWithoutReaction={daysWithoutReaction}
        data-testid="how-it-works-header"
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">What This Allergy Tracker Does</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Baby Allergy Tracker takes the guesswork out of food introductions, helping you spot what's really behind your baby's reactions.
            </p>
            <p>
              Each time your baby completes a trial without a reaction, they earn a green brick — building a clear visual record of what's safe and what needs caution.
            </p>
          </CardContent>
        </Card>

        {/* The Brick System */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How it works - the brick system</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-6 rounded flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, hsl(142 52% 65%) 0%, hsl(142 52% 55%) 100%)'
                }} />
                <div>
                  <p className="font-medium text-sm">Green = Safe</p>
                  <p className="text-xs text-muted-foreground">Trial finished, no reaction.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-6 rounded flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, hsl(38 92% 65%) 0%, hsl(38 92% 55%) 100%)'
                }} />
                <div>
                  <p className="font-medium text-sm">Amber = Warning</p>
                  <p className="text-xs text-muted-foreground">A new reaction after previous safe trials.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-6 rounded flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, hsl(0 70% 75%) 0%, hsl(0 70% 65%) 100%)'
                }} />
                <div>
                  <p className="font-medium text-sm">Red = Reaction</p>
                  <p className="text-xs text-muted-foreground">Reacted the first time or again after a warning.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                <strong>Why it matters:</strong> It shows the full story — some foods change over time, 
                and the bricks make that easy to spot.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Food Status Levels */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Food Status Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <span className="text-success text-lg">✓</span>
                <div>
                  <p className="font-medium text-sm">Passed once</p>
                  <p className="text-xs text-muted-foreground">One good trial</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <TrendingUp className="w-4 h-4 text-accent" />
                <div>
                  <p className="font-medium text-sm">Building confidence</p>
                  <p className="text-xs text-muted-foreground">Two good trials</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <CheckCircle className="w-4 h-4 text-success" />
                <div>
                  <p className="font-medium text-sm">Safe food</p>
                  <p className="text-xs text-muted-foreground">Three+ consecutive passes</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <span className="text-orange-500 text-lg">🔶</span>
                <div>
                  <p className="font-medium text-sm">Possible allergy</p>
                  <p className="text-xs text-muted-foreground">Reacted first time</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="font-medium text-sm">Caution</p>
                  <p className="text-xs text-muted-foreground">Mixed results or multiple reactions</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2 border-b border-border">
                <CircleAlert className="w-4 h-4 text-destructive" />
                <div>
                  <p className="font-medium text-sm">Confirmed allergy</p>
                  <p className="text-xs text-muted-foreground">Three+ consecutive reactions</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-3 items-center py-2">
                <Circle className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Not tested</p>
                  <p className="text-xs text-muted-foreground">Haven't tried yet</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm list-decimal list-inside">
              <li>
                <strong>Start a trial:</strong> Tap "Start New Trial", pick a food, and begin a 3-day observation period.
              </li>
              <li>
                <strong>Log a reaction:</strong> If symptoms appear, tap "Log Reaction", choose what happened, and save. 
                The right brick is added automatically.
              </li>
              <li>
                <strong>Complete the trial:</strong> After 3 days with no reaction, tap "Complete Trial" to add a green brick.
              </li>
              <li>
                <strong>Track progress:</strong> The Home screen shows each food's status, passes, and reactions.
              </li>
              <li>
                <strong>Share reports:</strong> In the Reports tab, email your child's food history to your doctor.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Tips for Parents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li>Re-try safe foods occasionally to confirm tolerance.</li>
              <li>Note times, portions, and symptoms for clearer patterns.</li>
              <li>Always contact a doctor for severe or repeated reactions.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Reminder */}
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-xl text-amber-900 dark:text-amber-100">⚠️ Important Reminder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            <p>
              Baby Allergy Tracker is a support and record-keeping tool, not a substitute for professional medical advice, diagnosis, or treatment.
            </p>
            <p>
              By using the app, you acknowledge it's a support tool only, and that medical decisions should always be made with a qualified health professional.
            </p>
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

      <MobileNav activeTab="how-it-works" />

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
    </div>
  );
}
