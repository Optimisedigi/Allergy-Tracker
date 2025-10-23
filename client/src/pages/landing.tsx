import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp } from "lucide-react";
import logoImage from "@assets/Allergy-tracker-bubs-logo_1761222543067.png";

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
              className="h-28 w-auto object-contain"
              data-testid="landing-logo"
            />
          </div>
          
          <h1 className="mb-4 text-lg font-bold text-foreground sm:text-xl">
            Allergy Tracker for Bubs
          </h1>
          
          <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
            We know how hard it is to figure out what foods are triggering your little one's rashes or eczema. We're parents who've been there too. That's why we built this food allergy tracker.
          </p>
          
          <p className="mb-5 text-xs text-muted-foreground leading-relaxed">
            Our goal is simple: help you clearly track foods and spot reactions with confidence.
          </p>

          {/* Brick System Section */}
          <div className="mb-5 rounded-lg bg-muted/30 px-4 py-4 text-center mt-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground mt-6">
              The Brick System
            </h2>
            
            <p className="mb-3 text-xs text-muted-foreground">
              Every new food builds your baby's story:
            </p>
            
            <div className="space-y-2 text-xs">
              <p className="text-foreground">
                <span className="font-semibold">🟢 Green Bricks</span> — Clear
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🟠 Orange Bricks</span> — Care
              </p>
              <p className="text-foreground">
                <span className="font-semibold">🔴 Red Bricks</span> — Likely sensitivity
              </p>
            </div>
            
            <p className="mt-3 text-xs text-muted-foreground italic">
              Each brick shows progress over time, helping you see which foods are safe, which need watching, and which to pause.
            </p>
          </div>

          {/* Final CTA Section */}
          <div className="text-center mt-12">
            <h2 className="mb-3 text-sm font-semibold text-foreground mt-8">
              Ready to feel confident again?
            </h2>
            <Button 
              size="lg" 
              className="px-8 py-4 text-sm"
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
