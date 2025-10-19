import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp } from "lucide-react";
import logoImage from "@assets/allergy-track-bubs-logo-transparent_1759840057297.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative px-4 py-12 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center">
            <img 
              src={logoImage} 
              alt="AllergyTrack Bubs Logo" 
              className="h-24 w-auto object-contain"
              data-testid="landing-logo"
            />
          </div>
          
          <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
            AllergyTrack Bubs
          </h1>
          
          <p className="mb-6 text-xl text-muted-foreground">
            1 in 13 kids live with food allergies. Our app helps parents log foods, record reactions, and build a clear allergy-tracking history so you can feel confident about what's safe to serve.
          </p>
          
          <Button 
            size="lg" 
            className="px-8 py-4 text-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-cta-login"
          >
            Start Tracking Now
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-feature-tracking">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Visual Progress Tracking</h3>
                <p className="text-muted-foreground">
                  See your baby's food safety progress with our unique brick chart visualization. Each brick represents a successful allergy-free trial.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-monitoring">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Heart className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Reaction Monitoring</h3>
                <p className="text-muted-foreground">
                  Log and track allergic reactions with detailed timing, severity levels, and symptoms. Get gentle reminders during observation periods.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
