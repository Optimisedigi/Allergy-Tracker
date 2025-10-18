import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";

interface UserSettings {
  defaultObservationPeriod: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  timezone: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [babyName, setBabyName] = useState<string>("");
  const [settings, setSettings] = useState<UserSettings>({
    defaultObservationPeriod: 3,
    emailNotifications: true,
    pushNotifications: false,
    inAppNotifications: true,
    timezone: "Australia/Sydney",
  });

  const queryClient = useQueryClient();

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

  // Set first baby as selected by default and update baby name
  useEffect(() => {
    if (babies.length > 0 && !selectedBaby) {
      setSelectedBaby(babies[0].id);
      setBabyName(babies[0].name);
    }
  }, [babies, selectedBaby]);

  // Update baby name when selected baby changes
  useEffect(() => {
    const selectedBabyData = babies.find((b) => b.id === selectedBaby);
    if (selectedBabyData) {
      setBabyName(selectedBabyData.name);
    }
  }, [selectedBaby, babies]);

  // Get user settings
  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get dashboard data for days without reaction calculation
  const { data: dashboardData } = useQuery<{
    stats: { totalFoods: number; safeFoods: number; foodAllergies: number };
    activeTrials: any[];
    recentActivity: any[];
    foodProgress: Array<{
      food: any;
      bricks: Array<{ type: string; date: string }>;
      passCount: number;
      reactionCount: number;
      lastTrial: Date | null;
    }>;
  }>({
    queryKey: ["/api/dashboard", selectedBaby],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Update local settings when data loads
  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      await apiRequest("PATCH", "/api/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved",
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
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Update baby name mutation
  const updateBabyNameMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("PATCH", `/api/babies/${selectedBaby}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies"] });
      toast({
        title: "Baby Name Updated",
        description: "Baby's name has been updated successfully",
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
        description: "Failed to update baby name",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleSaveBabyName = () => {
    if (babyName.trim()) {
      updateBabyNameMutation.mutate(babyName.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedBabyData = babies.find((b) => b.id === selectedBaby);

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
    <div className="min-h-screen pb-20 bg-background" data-testid="settings-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        daysWithoutReaction={daysWithoutReaction}
        data-testid="settings-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold text-foreground mb-6" data-testid="text-settings-title">
          Settings
        </h2>

        {/* Baby Profile */}
        <Card className="mb-4" data-testid="card-baby-profile">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Baby Profile</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="babyName" className="block text-sm font-medium text-foreground mb-2">
                  Baby's Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="babyName"
                    type="text"
                    value={babyName}
                    onChange={(e) => setBabyName(e.target.value)}
                    placeholder="Enter baby's name"
                    data-testid="input-baby-name"
                  />
                  <Button 
                    onClick={handleSaveBabyName}
                    disabled={updateBabyNameMutation.isPending || !babyName.trim()}
                    data-testid="button-save-baby-name"
                  >
                    {updateBabyNameMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="birthDate" className="block text-sm font-medium text-foreground mb-2">
                  Date of Birth
                </Label>
                <Input
                  id="birthDate"
                  type="text"
                  value={selectedBabyData?.dateOfBirth ? new Date(selectedBabyData.dateOfBirth).toLocaleDateString() : ""}
                  readOnly
                  className="bg-muted"
                  data-testid="input-birth-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card className="mb-4" data-testid="card-default-settings">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Default Observation Period</h3>
            <Select
              value={settings.defaultObservationPeriod.toString()}
              onValueChange={(value) => handleSettingChange('defaultObservationPeriod', parseInt(value))}
            >
              <SelectTrigger data-testid="select-observation-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days (recommended)</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-4" data-testid="card-notifications">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                <span className="text-sm font-medium text-foreground">In-app notifications</span>
                <Checkbox
                  checked={settings.inAppNotifications}
                  onCheckedChange={(checked) => handleSettingChange('inAppNotifications', checked)}
                  data-testid="checkbox-in-app-notifications"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                <span className="text-sm font-medium text-foreground">Email reminders</span>
                <Checkbox
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                  data-testid="checkbox-email-notifications"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                <span className="text-sm font-medium text-foreground">Push notifications</span>
                <Checkbox
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                  data-testid="checkbox-push-notifications"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="mb-4" data-testid="card-privacy">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Privacy & Data</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between">
                <span>View Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between">
                <span>Export All Data</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center justify-between">
                <span>Delete All Data</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card data-testid="card-account">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Account</h3>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-sign-out"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <MobileNav activeTab="settings" />
    </div>
  );
}
