import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp } from "lucide-react";
import logoImage from "@assets/Allergy-tracker-bubs-logo_1761222543067.png";

export default function Landing() {
  // Set SEO metadata
  useEffect(() => {
    // Save original values
    const originalTitle = document.title;
    const originalMetaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    
    // Set landing page SEO metadata
    document.title = "Baby Food Allergy Tracker App";
    
    // Set or update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Track your baby\'s food introductions and reactions easily. Allergy Tracker for Bubs helps parents spot triggers and share reports with doctors.');
    
    // Cleanup: restore original values when navigating away
    return () => {
      document.title = originalTitle || "Baby Allergy Tracker";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        if (originalMetaDescription) {
          metaDesc.setAttribute('content', originalMetaDescription);
        } else {
          metaDesc.remove();
        }
      }
    };
  }, []);

  // Check for invite parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteBabyId = urlParams.get('invite');
  
  const handleLogin = () => {
    const loginUrl = inviteBabyId 
      ? `/api/login?invite=${inviteBabyId}`
      : '/api/login';
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative px-4 py-6 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <img 
              src={logoImage} 
              alt="Baby Allergy Tracker Logo" 
              className="h-28 w-auto object-contain"
              data-testid="landing-logo"
            />
          </div>
          
          {/* Introduction Card */}
          <Card className="mb-3">
            <CardContent className="p-4">
              <h1 className="mb-3 text-lg font-bold text-foreground sm:text-xl">
                Baby Food Allergy Tracker
              </h1>
              
              <p className="mb-2 text-xs text-muted-foreground leading-relaxed">
                We know how hard it is to figure out what foods are triggering your little one's rashes or eczema. We're parents who've been there too. That's why we built this food allergy tracker.
              </p>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our goal is simple: help you clearly track foods and spot reactions with confidence.
              </p>
            </CardContent>
          </Card>

          {/* Brick System Card */}
          <Card className="mb-3">
            <CardContent className="p-4 text-center">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                How the Brick System Works
              </h2>
              
              <p className="mb-3 text-xs text-muted-foreground">
                Every food you try builds part of your baby's story:
              </p>
              
              <div className="space-y-2 text-xs">
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
              
              <p className="mt-3 text-xs text-muted-foreground">
                Each brick shows progress over time, helping you see which foods are safe, which need watching, and which to pause for now.
              </p>
            </CardContent>
          </Card>

          {/* CTA Card */}
          <Card>
            <CardContent className="p-4 text-center">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Ready to feel confident again?
              </h2>
              <Button 
                size="lg" 
                className="px-8 py-4 text-sm"
                onClick={handleLogin}
                data-testid="button-cta-login"
              >
                Start Tracking Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
