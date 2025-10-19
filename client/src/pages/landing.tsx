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
          
          <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
            Allergy Tracker for Bubs
          </h1>
          
          <p className="mb-3 text-base text-muted-foreground leading-relaxed">
            We know how hard it can be to figure out what food is triggering your little one's reactions — whether it's a rash, irritation tummy upset, or eczema flare-up.
            That's exactly why we built Allergy Tracker for Bubs, by parents who've been there too, trying to make sense of it all.
          </p>
          
          <p className="mb-5 text-base text-muted-foreground leading-relaxed">
            Our mission is simple: to make it clear for parents to visually track foods and spot reactions.
          </p>

          {/* Brick System Section */}
          <div className="mb-5 rounded-lg bg-muted/30 px-4 py-4 text-left">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              How the Brick System Works
            </h2>
            
            <p className="mb-3 text-sm text-muted-foreground">
              Every food you try builds part of your baby's story:
            </p>
            
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                <span className="font-semibold">🟢 Green Bricks</span> — Safe foods
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🟠 Orange Bricks</span> — Watch with care
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🔴 Red Bricks</span> — Likely allergen or sensitivity
              </p>
            </div>
            
            <p className="mt-3 text-sm text-muted-foreground italic">
              Each brick shows progress over time, helping you see which foods are safe, which need watching, and which to pause for now.
            </p>
          </div>

          {/* Final CTA Section */}
          <div className="text-center">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              👶 Ready to feel confident again?
            </h2>
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
