import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Heart, TrendingUp, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative px-4 py-12 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          
          <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
            AllergyTrack Bubs
          </h1>
          
          <p className="mb-4 text-lg font-medium text-foreground">
            Food allergies affect 1 in 13 kids. We're here to help families feel in control.
          </p>
          
          <p className="mb-6 text-xl text-muted-foreground">
            Track your baby's food journey with confidence. Monitor allergic reactions and build trust in safe foods, one trial at a time.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
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

            <Card data-testid="card-feature-sharing">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Multi-Parent Access</h3>
                <p className="text-muted-foreground">
                  Share access with partners and caregivers. Export detailed reports for your pediatrician with complete trial history.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to start tracking safely?
          </h2>
          <p className="mb-6 text-lg text-muted-foreground">
            Join parents who trust AllergyTrack Bubs to help navigate their baby's food journey with confidence and peace of mind.
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
    </div>
  );
}
