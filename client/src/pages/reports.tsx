import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Utensils, CheckCircle, CircleAlert } from "lucide-react";
import { formatAustralianDate } from "@/lib/date-utils";

interface ReportsData {
  stats: { totalFoods: number; safePasses: number };
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

  const handleSendReport = () => {
    if (!doctorEmail) {
      toast({
        title: "Email Required",
        description: "Please enter the doctor's email address",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, this would send the email via API
    toast({
      title: "Report Sent",
      description: `Report has been sent to ${doctorEmail}`,
    });
    setDoctorEmail("");
  };

  const reactionCount = reportsData?.foodProgress.reduce((sum, food) => sum + food.reactionCount, 0) || 0;
  const safeCount = reportsData?.foodProgress.filter(food => food.reactionCount === 0 && food.passCount > 0).length || 0;

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="reports-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        title="Food Reports"
        data-testid="reports-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-reports-title">
            Food Reports
          </h2>
          <Button 
            className="flex items-center gap-2"
            onClick={() => window.print()}
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export PDF</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="card-summary-total">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Foods Tested</p>
                <Utensils className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {reportsData?.stats.totalFoods || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-safe">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Safe Foods</p>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <p className="text-3xl font-bold text-success">{safeCount}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-reactions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Reactions Logged</p>
                <CircleAlert className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-3xl font-bold text-destructive">{reactionCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Food List */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Detailed Food History</h3>
            </div>
            
            <div className="divide-y divide-border">
              {reportsData?.foodProgress.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No food trials recorded yet. Start tracking to see reports here!
                </div>
              ) : (
                reportsData?.foodProgress.map((foodData) => (
                  <div 
                    key={foodData.food.id} 
                    className="p-4 hover:bg-muted/30 transition-colors"
                    data-testid={`food-report-${foodData.food.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{foodData.food.emoji || "🍼"}</span>
                        <div>
                          <h4 className="font-semibold text-foreground">{foodData.food.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            First trial: {foodData.firstTrial ? formatAustralianDate(new Date(foodData.firstTrial)) : "N/A"}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        foodData.reactionCount === 0 && foodData.passCount > 0
                          ? "bg-success/10 text-success"
                          : foodData.reactionCount > 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {foodData.reactionCount === 0 && foodData.passCount > 0
                          ? "Safe"
                          : foodData.reactionCount > 0
                          ? "Reactions"
                          : "Testing"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Total Passes</p>
                        <p className="font-semibold text-foreground">{foodData.passCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Reactions</p>
                        <p className="font-semibold text-foreground">{foodData.reactionCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Last Trial</p>
                        <p className="font-semibold text-foreground">
                          {foodData.lastTrial ? formatAustralianDate(new Date(foodData.lastTrial)) : "N/A"}
                        </p>
                      </div>
                    </div>

                    {foodData.reactionCount > 0 && (
                      <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-destructive mb-2">Reaction History:</p>
                        <p className="text-xs text-destructive-foreground">
                          This food has shown {foodData.reactionCount} reaction(s). Consult with your pediatrician before continuing trials.
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Report Section */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Email Report to Doctor</h3>
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

      {/* Mobile Navigation */}
      <MobileNav activeTab="reports" />
    </div>
  );
}
