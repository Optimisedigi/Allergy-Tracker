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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, Check, ChevronsUpDown, Download, UserPlus, X, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface UserSettings {
  defaultObservationPeriod: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  timezone: string;
}

const TIMEZONES = [
  { value: "Pacific/Auckland", label: "Auckland (GMT+12/+13)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10/+11)" },
  { value: "Australia/Melbourne", label: "Melbourne (GMT+10/+11)" },
  { value: "Australia/Brisbane", label: "Brisbane (GMT+10)" },
  { value: "Australia/Adelaide", label: "Adelaide (GMT+9:30/+10:30)" },
  { value: "Australia/Perth", label: "Perth (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (GMT+8)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Europe/London", label: "London (GMT+0/+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1/+2)" },
  { value: "America/New_York", label: "New York (GMT-5/-4)" },
  { value: "America/Chicago", label: "Chicago (GMT-6/-5)" },
  { value: "America/Denver", label: "Denver (GMT-7/-6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8/-7)" },
  { value: "America/Toronto", label: "Toronto (GMT-5/-4)" },
  { value: "America/Vancouver", label: "Vancouver (GMT-8/-7)" },
];

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [babyName, setBabyName] = useState<string>("");
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeCaregiverId, setRemoveCaregiverId] = useState<string | null>(null);
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

  // Get caregivers for selected baby
  const { data: caregivers = [] } = useQuery<Array<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>>({
    queryKey: ["/api/babies", selectedBaby, "caregivers"],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

  // Get pending invitations for selected baby
  const { data: pendingInvitations = [] } = useQuery<Array<{
    id: string;
    invitedEmail: string;
    role: string;
    createdAt: string;
    invitedByUser: {
      name: string;
      email: string;
    };
  }>>({
    queryKey: ["/api/babies", selectedBaby, "invitations"],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

  // Invite caregiver mutation
  const inviteCaregiverMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", `/api/babies/${selectedBaby}/invite`, { email, role: "parent" });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies", selectedBaby, "caregivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/babies", selectedBaby, "invitations"] });
      setInviteEmail("");
      
      if (data.userExists) {
        toast({
          title: "Caregiver Added",
          description: "The user has been granted access immediately",
        });
      } else {
        toast({
          title: "Invitation Sent",
          description: "An invitation will be available when they sign up",
        });
      }
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Remove caregiver mutation
  const removeCaregiverMutation = useMutation({
    mutationFn: async (caregiverId: string) => {
      await apiRequest("DELETE", `/api/babies/${selectedBaby}/caregivers/${caregiverId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies", selectedBaby, "caregivers"] });
      setRemoveCaregiverId(null);
      toast({
        title: "Caregiver Removed",
        description: "Access has been revoked successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        description: error.message || "Failed to remove caregiver",
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

  const handleInviteCaregiver = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    inviteCaregiverMutation.mutate(inviteEmail.trim().toLowerCase());
  };

  const handleRemoveCaregiver = (caregiverId: string) => {
    removeCaregiverMutation.mutate(caregiverId);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: 'Please type "DELETE" to confirm account deletion',
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted",
      });

      // Redirect to logout after short delay
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 1500);
    } catch (error) {
      console.error('Delete account error:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    if (!selectedBaby) {
      toast({
        title: "Error",
        description: "Please select a baby to export data",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Fetch the CSV data with credentials
      const response = await fetch(`/api/babies/${selectedBaby}/export-csv`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // Check for unauthorized error
        if (response.status === 401) {
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

        // Handle other errors
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(errorText || `Server returned ${response.status}`);
      }

      // Get the CSV data as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with proper fallbacks
      const babyNameForFile = selectedBabyData?.name || babyName || selectedBaby;
      const sanitizedName = babyNameForFile.toLowerCase().replace(/\s+/g, '_');
      link.download = `allergy-tracker-${sanitizedName}-${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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

        {/* Timezone */}
        <Card className="mb-4" data-testid="card-timezone">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Timezone</h3>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  className="w-full justify-between"
                  data-testid="button-timezone-selector"
                >
                  {settings.timezone
                    ? TIMEZONES.find((tz) => tz.value === settings.timezone)?.label
                    : "Select timezone..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" data-testid="popover-timezone">
                <Command>
                  <CommandInput placeholder="Search timezone..." data-testid="input-timezone-search" />
                  <CommandList>
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      {TIMEZONES.map((tz) => (
                        <CommandItem
                          key={tz.value}
                          value={tz.value}
                          onSelect={(currentValue) => {
                            handleSettingChange('timezone', currentValue);
                            setTimezoneOpen(false);
                          }}
                          data-testid={`timezone-option-${tz.value}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              settings.timezone === tz.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tz.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              <Link href="/privacy-policy">
                <button 
                  className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between"
                  data-testid="button-view-privacy-policy"
                >
                  <span>View Privacy Policy</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </Link>
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-export-data"
              >
                <span className="flex items-center gap-2">
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export All Data
                    </>
                  )}
                </span>
                {!isExporting && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center justify-between"
                data-testid="button-delete-account"
              >
                <span>Delete Account</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Manage Users */}
        <Card className="mb-4" data-testid="card-manage-caregivers">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Manage Users</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share access with your partner or other caregivers so they can track trials and reactions together.
            </p>
            
            {/* Invite Form */}
            <div className="mb-6">
              <Label htmlFor="inviteEmail" className="block text-sm font-medium text-foreground mb-2">
                Invite by Email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@example.com"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleInviteCaregiver();
                    }
                  }}
                  data-testid="input-invite-email"
                />
                <Button 
                  onClick={handleInviteCaregiver}
                  disabled={inviteCaregiverMutation.isPending || !inviteEmail.trim()}
                  data-testid="button-send-invite"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {inviteCaregiverMutation.isPending ? "Sending..." : "Invite"}
                </Button>
              </div>
            </div>

            {/* Current Users */}
            {caregivers.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Current Users ({caregivers.length})</h4>
                <div className="space-y-2">
                  {caregivers.map((caregiver, index) => {
                    const isCreator = index === 0; // First user in the list is the creator
                    const isCurrentUser = user && (user as any).claims?.sub === caregiver.id;
                    const canRemove = !isCreator && !isCurrentUser;
                    
                    return (
                      <div 
                        key={caregiver.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        data-testid={`caregiver-item-${caregiver.id}`}
                      >
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground" data-testid={`text-caregiver-email-${caregiver.id}`}>
                            {caregiver.email}
                          </p>
                        </div>
                        {canRemove ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCaregiver(caregiver.id)}
                            disabled={removeCaregiverMutation.isPending}
                            data-testid={`button-remove-caregiver-${caregiver.id}`}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        ) : isCurrentUser ? (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full" data-testid="badge-you">
                            You
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Pending Invitations ({pendingInvitations.length})</h4>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-l-2 border-orange-500"
                      data-testid={`pending-invitation-${invitation.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground" data-testid={`text-invitation-email-${invitation.id}`}>
                            {invitation.invitedEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Waiting for sign up
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {caregivers.length === 0 && pendingInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-caregivers">
                No users yet. Invite someone to get started.
              </p>
            )}
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

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your account and profile</li>
                <li>All baby profiles</li>
                <li>All food trials and reactions</li>
                <li>All steroid cream logs</li>
                <li>All exported data and reports</li>
              </ul>
              <p className="mt-4 font-semibold text-foreground">
                Type "DELETE" to confirm:
              </p>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="mt-2"
                data-testid="input-delete-confirm"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmText("");
                setIsDeleteDialogOpen(false);
              }}
              data-testid="button-cancel-delete-account"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE"}
              data-testid="button-confirm-delete-account"
            >
              Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
