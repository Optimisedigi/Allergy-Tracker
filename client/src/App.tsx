import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import HowItWorks from "@/pages/how-it-works";
import Settings from "@/pages/settings";
import PrivacyPolicy from "@/pages/privacy-policy";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: babies = [], isLoading: babiesLoading } = useQuery<Array<{ id: string }>>({
    queryKey: ["/api/babies"],
    enabled: isAuthenticated,
    retry: false,
  });

  const firstBabyId = babies.length > 0 ? babies[0].id : null;

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{ foodProgress: any[] }>({
    queryKey: ["/api/dashboard", firstBabyId],
    enabled: isAuthenticated && !!firstBabyId,
    retry: false,
  });

  const needsOnboarding = isAuthenticated && !babiesLoading && babies.length === 0;
  const hasNoTrials = dashboardData && dashboardData.foodProgress.length === 0;
  const isFirstTimeUser = isAuthenticated && !babiesLoading && !dashboardLoading && babies.length > 0 && hasNoTrials;

  useEffect(() => {
    if (isFirstTimeUser && location === "/") {
      setLocation("/how-it-works");
    }
  }, [isFirstTimeUser, location, setLocation]);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : needsOnboarding ? (
        <Route path="/" component={Onboarding} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/settings" component={Settings} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
