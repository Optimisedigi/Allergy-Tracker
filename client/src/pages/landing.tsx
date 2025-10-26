import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart, TrendingUp, Download, Smartphone } from "lucide-react";
import logoImage from "@assets/Allergy-tracker-bubs-logo_1761222543067.png";
import { showInstallPrompt, canShowInstallPrompt, isPWA } from "@/registerServiceWorker";

const faqData = [
  {
    question: "What is Allergy Tracker for Bubs?",
    answer: "Allergy Tracker for Bubs is a parent-designed app that helps you log your baby's food introductions, track any reactions, and share clear reports with your doctor. It takes the guesswork out of identifying which foods may be causing sensitivities or allergies."
  },
  {
    question: "Is the app a medical tool?",
    answer: "No. Allergy Tracker for Bubs is a support and record-keeping tool, not a medical diagnostic app. Always consult a qualified health professional for medical advice, diagnosis, or treatment."
  },
  {
    question: "What kind of reactions can I track?",
    answer: "You can record common reactions like itchiness, rash, hives, swelling, vomiting, or irritability. You can also log notes about behavioural changes such as fussiness or sleep disturbance."
  },
  {
    question: "Can I share my baby's allergy data via email?",
    answer: "Yes. You can easily export all your data as a report (CSV or PDF) to share with your paediatrician or allergist. It's a simple way to give healthcare professionals a clear overview of your child's food history."
  },
  {
    question: "How is my data protected?",
    answer: "Allergy Tracker for Bubs follows Australian privacy standards under the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). Your data is encrypted, stored securely on Australian servers, and never sold or shared for marketing purposes."
  },
  {
    question: "Can I use the app for more than one child?",
    answer: "Yes! You can create separate baby profiles within the same account, so each child's food trials and reactions are tracked individually."
  },
  {
    question: "Is Allergy Tracker for Bubs free to use?",
    answer: "The core features are free to use as we're gaining feedback from parents. You can use it for free now."
  },
  {
    question: "Does the app remind me when a food trial ends?",
    answer: "Yes. The app automatically tracks your observation period (usually 3 days) and can send gentle reminders when it's time to complete or review a trial."
  },
  {
    question: "Who created Allergy Tracker for Bubs?",
    answer: "Allergy Tracker for Bubs was created by parents who've experienced the challenge of having a child with eczema when starting their solid food journey and the issue with identifying food reactions first-hand. It's built with empathy, simplicity, and safety in mind to make life easier for families navigating food introductions."
  }
];

export default function Landing() {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstallingPWA, setIsInstallingPWA] = useState(false);

  // Check if PWA can be installed
  useEffect(() => {
    const checkInstallable = () => {
      setShowInstallButton(canShowInstallPrompt() && !isPWA());
    };

    checkInstallable();
    window.addEventListener('pwa-installable', checkInstallable);

    return () => {
      window.removeEventListener('pwa-installable', checkInstallable);
    };
  }, []);

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
    
    // Add FAQ Schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    
    let faqScript = document.querySelector('script#faq-schema');
    if (!faqScript) {
      faqScript = document.createElement('script');
      faqScript.setAttribute('type', 'application/ld+json');
      faqScript.setAttribute('id', 'faq-schema');
      document.head.appendChild(faqScript);
    }
    faqScript.textContent = JSON.stringify(faqSchema);
    
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
      const script = document.querySelector('script#faq-schema');
      if (script) {
        script.remove();
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

  const handleInstallPWA = async () => {
    setIsInstallingPWA(true);
    const installed = await showInstallPrompt();
    if (installed) {
      setShowInstallButton(false);
    }
    setIsInstallingPWA(false);
  };

  return (
    <div className="min-h-screen bg-[#fff9eb] dark:bg-background">
      {/* Hero Section */}
      <div className="relative px-4 py-6 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Logo - reduced by 15% */}
          <div className="mb-4 flex justify-center">
            <img 
              src={logoImage} 
              alt="Baby Allergy Tracker Logo" 
              className="h-24 w-auto object-contain"
              data-testid="landing-logo"
            />
          </div>
          
          {/* Introduction Card */}
          <Card className="mb-3">
            <CardContent className="p-4">
              <h1 className="mb-2 text-lg font-bold text-foreground sm:text-xl">
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
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                How the Brick System Works
              </h2>
              
              <p className="mb-3 text-xs text-muted-foreground">
                Each brick adds more to your baby's food story.
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
                Each brick shows progress over time, helping you see which foods are safe, which need watching, and which to pause.
              </p>
            </CardContent>
          </Card>

          {/* CTA Card */}
          <Card>
            <CardContent className="p-4 text-center">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Ready to feel confident again?
              </h2>
              <div className="space-y-2">
                <Button 
                  size="lg" 
                  className="px-8 py-[0.25rem] text-sm w-full sm:w-auto"
                  onClick={handleLogin}
                  data-testid="button-cta-login"
                >
                  Start Tracking Now
                </Button>
                
                {showInstallButton && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-muted">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleInstallPWA}
                      disabled={isInstallingPWA}
                      data-testid="button-install-pwa"
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {isInstallingPWA ? "Installing..." : "Install as App"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-3">
            <CardContent className="p-4">
              <h2 className="mb-3 text-center text-base font-bold text-foreground">
                FAQs — Allergy Tracker for Bubs
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {faqData.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm font-semibold">
                      {index + 1}. {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
