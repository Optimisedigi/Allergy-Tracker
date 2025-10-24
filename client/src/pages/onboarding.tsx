import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import logoImage from "@assets/Allergy-tracker-bubs-logo_1761222543067.png";

export default function Onboarding() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [babyName, setBabyName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  const createBabyMutation = useMutation({
    mutationFn: async (babyData: { name: string; dateOfBirth: string; gender: string }) => {
      const response = await apiRequest("POST", "/api/babies", {
        ...babyData,
        dateOfBirth: new Date(babyData.dateOfBirth).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/babies"] });
      toast({
        title: "Welcome!",
        description: "Baby profile created successfully",
      });
      window.location.href = "/";
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to create baby profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!babyName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your baby's name",
        variant: "destructive",
      });
      return;
    }

    if (!dateOfBirth) {
      toast({
        title: "Date of Birth Required",
        description: "Please select your baby's date of birth",
        variant: "destructive",
      });
      return;
    }

    createBabyMutation.mutate({
      name: babyName.trim(),
      dateOfBirth,
      gender: gender || "not-specified",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="card-onboarding">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Baby Allergy Tracker Logo" 
              className="h-24 w-auto object-contain"
              data-testid="onboarding-logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Baby Allergy Tracker</CardTitle>
          <p className="text-muted-foreground mt-2">
            Let's set up your baby's profile to start tracking their food journey
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-onboarding">
            <div>
              <Label htmlFor="babyName" className="block text-sm font-medium text-foreground mb-2">
                Baby's Name *
              </Label>
              <Input
                id="babyName"
                type="text"
                placeholder="e.g., Emma"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                required
                data-testid="input-baby-name"
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground mb-2">
                Date of Birth *
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                data-testid="input-date-of-birth"
              />
            </div>

            <div>
              <Label htmlFor="gender" className="block text-sm font-medium text-foreground mb-2">
                Gender (optional)
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boy">Boy</SelectItem>
                  <SelectItem value="girl">Girl</SelectItem>
                  <SelectItem value="not-specified">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createBabyMutation.isPending}
              data-testid="button-create-profile"
            >
              {createBabyMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
