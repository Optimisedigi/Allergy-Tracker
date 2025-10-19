import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen pb-20 bg-background" data-testid="privacy-policy-container">
      <Header 
        babyName="" 
        user={user}
        data-testid="privacy-policy-header"
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/settings")}
          className="mb-4"
          data-testid="button-back-to-settings"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>

        <Card data-testid="card-privacy-policy">
          <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Policy for Allergy Tracker for Bubs</h1>
            <p className="text-sm text-muted-foreground mb-6">Last updated: October 19, 2025</p>

            <p className="text-foreground mb-6">
              Thank you for choosing Allergy Tracker for Bubs. We're committed to protecting your personal data and your baby's food-trial information. This Privacy Policy explains how we collect, use, share and protect information when you use our app.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. What we collect</h2>
            <p className="text-foreground mb-3">When you use the app, we collect the following types of information:</p>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Account information</h3>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Your email address, name (optional)</li>
              <li>Password (securely hashed)</li>
              <li>If you sign in with Google: your Google ID, name and email</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Baby trial data</h3>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Baby profile(s) you create: name (optional), date of birth (optional)</li>
              <li>Foods introduced, trial dates, observations, reactions, notes</li>
              <li>Any steroid cream treatment date/time (if recorded)</li>
              <li>Pass/reaction counts and statuses</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Usage & device information</h3>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Device type, operating system version</li>
              <li>App version, crash logs (anonymised)</li>
              <li>IP address and timezone (to record dates/times correctly)</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">We do not collect or store:</h3>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Payment or financial information</li>
              <li>Medical records beyond what you voluntarily enter</li>
              <li>Location tracking beyond timezone and device IP</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How we use your data</h2>
            <p className="text-foreground mb-3">We use your data to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Provide and maintain the app's functionality (tracking trials, generating reports)</li>
              <li>Enable you to export data (PDF/CSV/JSON) and share it with healthcare providers</li>
              <li>Improve the app and fix bugs (using anonymised logs)</li>
              <li>Send you non-intrusive notifications or updates (you can opt out)</li>
            </ul>
            <p className="text-foreground mb-6">
              We will not use your data for marketing, advertising, or selling to third parties.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. How we share your data</h2>
            <p className="text-foreground mb-3">
              We will never sell your personal or baby's data. We may share data under limited circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>With service providers who assist us (e.g., data storage, email services), under strict confidentiality</li>
              <li>If required by law or to protect our rights</li>
            </ul>
            <p className="text-foreground mb-6">
              Any sharing is strictly controlled and only involves the minimum data necessary.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Your rights</h2>
            <p className="text-foreground mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Access the data we hold for you (you can export it at any time)</li>
              <li>Correct or delete your account and all associated data</li>
              <li>Opt out of non-essential notifications</li>
              <li>Ask questions about how we process your data</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Data security & retention</h2>
            <p className="text-foreground mb-3">We take data security seriously:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground space-y-1">
              <li>Passwords are hashed and never stored in plain text</li>
              <li>Servers are secured and only authorised personnel have access</li>
              <li>Data is stored on secure infrastructure in line with industry best practices</li>
            </ul>
            <p className="text-foreground mb-6">
              We keep your data for as long as you use the app. If you delete your account, we will remove your data unless we are required to keep it by law.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Kids & parental controls</h2>
            <p className="text-foreground mb-3">
              This app is designed for parents and caregivers. If you are under 16, please use the app only with parental consent.
            </p>
            <p className="text-foreground mb-6">
              Parents: you control the data entered for your baby and can manage, export or delete it at any time.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Changes to this policy</h2>
            <p className="text-foreground mb-6">
              We may update this policy from time to time. We will show the "Last updated" date at the top and post the new version in the app. We recommend checking it occasionally.
            </p>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-foreground font-medium">
                Thank you for trusting us with your baby's food-trial journey. We're here to help you track safely and confidently.
              </p>
              <p className="text-muted-foreground mt-2">— The Allergy Tracker for Bubs Team</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <MobileNav activeTab="settings" />
    </div>
  );
}
