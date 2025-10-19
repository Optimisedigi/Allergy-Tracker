import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp } from "lucide-react";
import logoImage from "@assets/allergy-track-bubs-logo-transparent_1759840057297.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative px-4 py-8 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex justify-center">
            <img 
              src={logoImage} 
              alt="Allergy Tracker for Bubs Logo" 
              className="h-20 w-auto object-contain"
              data-testid="landing-logo"
            />
          </div>
          
          <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            ❤️ Allergy Tracker for Bubs
          </h1>
          
          <p className="mb-3 text-base text-muted-foreground leading-relaxed">
            We know how tough it can be to figure out what's causing your little one's reactions — whether it's a rash, tummy upset, or another flare-up.
            That's exactly why we built Allergy Tracker for Bubs — made by parents who've been there too.
          </p>
          
          <p className="mb-5 text-base text-muted-foreground leading-relaxed">
            Our goal is to help you feel calm and confident during food introductions. With simple tools to track what your baby eats, spot reactions early, and share clear updates with your doctor, you'll finally have everything in one place.
          </p>

          {/* Brick System Section */}
          <div className="mb-5 rounded-lg bg-muted/30 px-4 py-4 text-left">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              🌈 How It Works — The Brick System
            </h2>
            
            <p className="mb-3 text-sm text-muted-foreground">
              Every food you try builds part of your baby's story.
            </p>
            
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                <span className="font-semibold">🟢 Green Bricks</span> — Safe foods (no reaction)
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🟠 Orange Bricks</span> — Watch with care (a mild or new reaction)
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🔴 Red Bricks</span> — Likely allergen (a confirmed reaction)
              </p>
            </div>
            
            <p className="mt-3 text-sm text-muted-foreground italic">
              Each brick shows progress over time, helping you see which foods are safe, which need watching, and which to pause for now.
              It's like building a wall of confidence, one safe food at a time.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 pb-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-xl font-semibold text-foreground">
            💚 What You Can Do
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card data-testid="card-feature-tracking">
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Visual Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  See your baby's food safety journey at a glance with our easy-to-read brick chart. Each green brick represents a successful, allergy-free trial.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-monitoring">
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Heart className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Reaction Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Log and track allergic reactions — note symptoms, severity, and duration. Gentle reminders help you stay consistent through observation periods.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Final CTA Section */}
          <div className="text-center">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              👶 Ready to feel confident again?
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Start tracking today and bring calm and clarity back to mealtimes.
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
    </div>
  );
}
