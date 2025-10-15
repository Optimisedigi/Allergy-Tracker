import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Utensils, CheckCircle, CircleAlert, Check, AlertTriangle, X, Copy } from "lucide-react";
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

  // Calculate status based on passes and reactions
  const getStatus = (passes: number, reactions: number) => {
    // Check for confirmed allergy first (highest priority)
    if (reactions >= 3) return "Confirmed allergy";
    
    // No trials yet
    if (passes === 0 && reactions === 0) return "Not tried yet";
    
    // Early stage passes
    if (passes === 1 && reactions === 0) return "Passed once";
    if (passes === 2 && reactions === 0) return "Building confidence";
    
    // Safe food (3+ passes, no reactions)
    if (passes >= 3 && reactions === 0) return "Safe food";
    
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
        return { icon: <Check className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" };
      case "Caution":
      case "Possible sensitivity":
        return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-500", bg: "bg-orange-500/10" };
      case "Likely allergy":
      case "Allergy suspected":
      case "Confirmed allergy":
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
                <p className="text-xs text-muted-foreground">Safe Foods</p>
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
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-[200px]">Trial</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Visual</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-[200px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsData?.foodProgress.map((foodData) => {
                      // Calculate total passes and reactions for final status
                      const passes = foodData.bricks.filter(b => b.type === 'safe').length;
                      const reactions = foodData.bricks.filter(b => b.type === 'reaction' || b.type === 'warning').length;
                      const status = getStatus(passes, reactions);
                      const statusDisplay = getStatusDisplay(status);

                      return (
                        <tr key={foodData.food.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{foodData.food.emoji || "🍼"}</span>
                              <span className="font-medium text-xs">{foodData.food.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-0.5">
                              {foodData.bricks.map((brick, brickIdx) => (
                                <div
                                  key={brickIdx}
                                  className={`w-6 h-5 rounded`}
                                  style={{
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
