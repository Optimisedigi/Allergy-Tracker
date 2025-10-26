import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SteroidCream {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationDays: number;
}

interface Reaction {
  id: string;
  startedAt: string;
  severity: string;
  foodName: string;
  trialDate: string;
}

interface CalendarData {
  steroidCreams: SteroidCream[];
  reactions: Reaction[];
}

export default function Calendar() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedBaby, setSelectedBaby] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // Fetch calendar data for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  const { data: calendarData } = useQuery<CalendarData>({
    queryKey: ["/api/babies", selectedBaby, "calendar", year, month],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

  // Get dashboard data to calculate days without reaction
  const { data: dashboardData } = useQuery<{
    foodProgress: Array<{
      food: { id: string; name: string; emoji?: string };
      bricks: Array<{ type: string; date: string }>;
    }>;
  }>({
    queryKey: ["/api/dashboard", selectedBaby],
    enabled: isAuthenticated && !!selectedBaby,
    retry: false,
  });

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

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe left - go to next month
        goToNextMonth();
      } else {
        // Swipe right - go to previous month
        goToPreviousMonth();
      }
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: Array<{ date: number; isCurrentMonth: boolean; gridColumn?: number }> = [];

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ 
        date: day, 
        isCurrentMonth: true,
        gridColumn: day === 1 ? startingDayOfWeek + 1 : undefined
      });
    }

    return days;
  };

  // Check if a date has steroid cream treatment
  const hasSteroidCream = (day: number): boolean => {
    if (!calendarData?.steroidCreams) return false;
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    return calendarData.steroidCreams.some(cream => {
      const startDate = new Date(cream.startedAt);
      const endDate = cream.endedAt ? new Date(cream.endedAt) : new Date(startDate.getTime() + ((cream.durationDays || 3) - 1) * 24 * 60 * 60 * 1000);
      
      return targetDate >= new Date(startDate.setHours(0, 0, 0, 0)) && 
             targetDate <= new Date(endDate.setHours(23, 59, 59, 999));
    });
  };

  // Check if a date has a reaction
  const hasReaction = (day: number): boolean => {
    if (!calendarData?.reactions) return false;
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    return calendarData.reactions.some(reaction => {
      const reactionDate = new Date(reaction.startedAt);
      return reactionDate.getDate() === day &&
             reactionDate.getMonth() === currentDate.getMonth() &&
             reactionDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedBabyData = babies.find((b) => b.id === selectedBaby);

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="calendar-container">
      <Header 
        babyName={selectedBabyData?.name || "Baby"} 
        user={user}
        daysWithoutReaction={daysWithoutReaction}
        babies={babies}
        selectedBaby={selectedBaby}
        onBabyChange={setSelectedBaby}
        data-testid="calendar-header"
      />

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Calendar Card */}
        <Card>
          <CardContent className="p-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                data-testid="button-previous-month"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <h3 className="text-base font-semibold text-foreground" data-testid="text-current-month">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div 
              className="touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              data-testid="calendar-grid-container"
            >
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-2 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-muted-foreground py-1"
                    data-testid={`header-${day}`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, index) => {
                  const isSteroidDay = hasSteroidCream(day.date);
                  const isReactionDay = hasReaction(day.date);
                  const isToday = day.date === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear();

                  return (
                    <div
                      key={index}
                      className="flex flex-col"
                      style={day.gridColumn ? { gridColumnStart: day.gridColumn } : undefined}
                      data-testid={`day-${day.date}`}
                    >
                      <span className={`
                        text-xs font-medium text-center mb-0.5
                        ${isToday ? "text-primary font-bold" : "text-foreground"}
                      `}>
                        {day.date}
                      </span>
                      <div
                        className={`
                          aspect-square rounded-lg border flex items-center justify-center bg-card border-border
                          ${isToday ? "border-primary border-[3px]" : ""}
                          ${isSteroidDay && !isReactionDay ? "bg-[#fef3c7] dark:bg-amber-900/30" : ""}
                          ${isReactionDay ? "bg-red-500 dark:bg-red-600" : ""}
                        `}
                      >
                        {isSteroidDay && (
                          <span className="text-xl" data-testid={`steroid-emoji-${day.date}`}>
                            🧴
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-foreground mb-2">Legend</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-border bg-[#fef3c7] dark:bg-amber-900/30 flex items-center justify-center text-sm">
                    🧴
                  </div>
                  <span className="text-xs text-muted-foreground">Steroid Cream Treatment</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-border bg-red-500 dark:bg-red-600"></div>
                  <span className="text-xs text-muted-foreground">Reaction Logged</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border-[3px] border-primary bg-card"></div>
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <MobileNav activeTab="calendar" />
    </div>
  );
}
