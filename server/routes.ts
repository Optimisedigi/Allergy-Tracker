import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { createTrialSchema, createReactionSchema, createSteroidCreamSchema, type InsertBaby } from "@shared/schema";
import { z } from "zod";
import cron from "node-cron";
import { reminderService } from "./services/reminder-service";
import { Resend } from "resend";
import { LOGO_DATA_URI } from "./emailLogo";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Delete account route
  app.delete('/api/account/delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Delete all user data
      await storage.deleteUser(userId);
      
      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Baby routes
  app.get('/api/babies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const babies = await storage.getBabiesByUser(userId);
      res.json(babies);
    } catch (error) {
      console.error("Error fetching babies:", error);
      res.status(500).json({ message: "Failed to fetch babies" });
    }
  });

  app.post('/api/babies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const babyData = {
        ...req.body,
        dateOfBirth: new Date(req.body.dateOfBirth),
      };
      
      const baby = await storage.createBaby(babyData);
      await storage.addUserToBaby(userId, baby.id);
      
      res.json(baby);
    } catch (error) {
      console.error("Error creating baby:", error);
      res.status(500).json({ message: "Failed to create baby" });
    }
  });

  app.patch('/api/babies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === id);
      if (!hasBaby) {
        return res.status(403).json({ message: "Unauthorized access to this baby profile" });
      }
      
      const updates: Partial<InsertBaby> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.gender !== undefined) updates.gender = req.body.gender;
      if (req.body.dateOfBirth !== undefined) {
        updates.dateOfBirth = new Date(req.body.dateOfBirth);
      }
      
      const baby = await storage.updateBaby(id, updates);
      res.json(baby);
    } catch (error) {
      console.error("Error updating baby:", error);
      res.status(500).json({ message: "Failed to update baby" });
    }
  });

  // Caregiver management routes
  app.get('/api/babies/:babyId/caregivers', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === babyId);
      if (!hasBaby) {
        return res.status(403).json({ message: "Unauthorized access to this baby profile" });
      }
      
      const caregivers = await storage.getUsersByBaby(babyId);
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Failed to fetch caregivers" });
    }
  });

  app.delete('/api/babies/:babyId/caregivers/:caregiverId', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, caregiverId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === babyId);
      if (!hasBaby) {
        return res.status(403).json({ message: "Unauthorized access to this baby profile" });
      }
      
      // Get all caregivers sorted by when they were added
      const caregivers = await storage.getUsersByBaby(babyId);
      
      // Don't allow removing yourself if you're the only caregiver
      if (caregivers.length === 1 && caregiverId === userId) {
        return res.status(400).json({ message: "Cannot remove yourself as the only caregiver" });
      }
      
      // Don't allow removing the original creator (first person added)
      const creator = caregivers[0]; // First person added is the creator (ordered by createdAt)
      if (creator && caregiverId === creator.id) {
        return res.status(400).json({ message: "Cannot remove the original creator of this profile" });
      }
      
      await storage.removeUserFromBaby(caregiverId, babyId);
      res.json({ message: "Caregiver removed successfully" });
    } catch (error) {
      console.error("Error removing caregiver:", error);
      res.status(500).json({ message: "Failed to remove caregiver" });
    }
  });

  // Invitation routes
  app.post('/api/babies/:babyId/invite', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const { email, role = 'parent' } = req.body;
      const userId = req.user.claims.sub;
      
      // Validate email
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === babyId);
      if (!hasBaby) {
        return res.status(403).json({ message: "Unauthorized access to this baby profile" });
      }
      
      // Check if user already has access
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        const caregivers = await storage.getUsersByBaby(babyId);
        const alreadyHasAccess = caregivers.some(c => c.id === existingUser.id);
        if (alreadyHasAccess) {
          return res.status(400).json({ message: "User already has access to this baby" });
        }
        
        // User exists, add them directly
        await storage.addUserToBaby(existingUser.id, babyId, role);
        return res.json({ message: "User added successfully", userExists: true });
      }
      
      // Create pending invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
      
      const invitation = await storage.createInvitation({
        babyId,
        invitedByUserId: userId,
        invitedEmail: email.toLowerCase(),
        role,
        expiresAt,
      });
      
      // Send invitation email
      try {
        const baby = await storage.getBaby(babyId);
        const inviter = await storage.getUser(userId);
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // Use real name only if both first and last name exist
        const inviterName = inviter?.firstName && inviter?.lastName 
          ? `${inviter.firstName} ${inviter.lastName}` 
          : null;
        
        // Fallback for display in email body (can use email)
        const inviterDisplayName = inviterName || inviter?.email || 'A caregiver';
        
        const appUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'allergytrack.replit.app';
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .container { background: #fff9eb; border-radius: 10px; padding: 30px; }
              .logo { text-align: center; margin-bottom: 20px; }
              .logo img { height: 80px; width: auto; }
              h1 { color: #2c3e50; margin-bottom: 10px; font-size: 24px; }
              .subtitle { color: #666; font-size: 16px; margin-bottom: 20px; }
              .message { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .button { display: inline-block; background: #4CAF50; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .button:hover { background: #45a049; }
              .highlight { background: #fff3cd; padding: 12px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <img src="${LOGO_DATA_URI}" alt="AllergyTrack for Bubs" />
              </div>
              <h1>🍼 Your Partner Wants You to Join AllergyTrack!</h1>
              <p class="subtitle">Track Your Baby's Food Allergies Together</p>
              
              <div class="message">
                <p>Hi there,</p>
                
                <p><strong>${inviterDisplayName}</strong> has invited you to help track food allergies and reactions for <strong>${baby?.name || 'your baby'}</strong>.</p>
                
                <p><strong>Why this matters:</strong> Many babies have sensitivities to certain foods that cause rashes, eczema, or tummy troubles. AllergyTrack helps you both keep a clear record of:</p>
                
                <ul style="margin: 15px 0; padding-left: 20px;">
                  <li>Which foods your baby has tried</li>
                  <li>Any reactions or symptoms that occurred</li>
                  <li>Which foods are safe and which to avoid</li>
                  <li>Progress over time with a visual brick system</li>
                </ul>
                
                <div class="highlight">
                  <strong>💚 Work together as a team</strong><br>
                  Both of you will be able to log food trials, track reactions, and see your baby's complete food history in one place.
                </div>
                
                <p><strong>Get started now:</strong></p>
                
                <a href="https://${appUrl}/api/login" class="button">Sign Up & Start Tracking</a>
                
                <p style="font-size: 14px; color: #666;">Once you sign up with this email address (<strong>${email.toLowerCase()}</strong>), you'll automatically get access to ${baby?.name || 'the baby'}'s food tracking data.</p>
                
                <p style="font-size: 13px; color: #999;">This invitation expires in 7 days.</p>
              </div>
              
              <div class="footer">
                <p>This invitation was sent to ${email.toLowerCase()}. If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 10px;">AllergyTrack for Bubs - Helping parents track food allergies with confidence.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        // Use generic subject if no real name available
        const subject = inviterName 
          ? `${inviterName} invited you to track ${baby?.name || 'their baby'}'s food allergies`
          : `You're invited to track ${baby?.name || 'your baby'}'s food allergies on AllergyTrack`;

        await resend.emails.send({
          from: 'AllergyTrack <onboarding@resend.dev>',
          to: email.toLowerCase(),
          subject,
          html: htmlContent,
        });
        
        console.log(`Invitation email sent to ${email.toLowerCase()} for baby ${babyId}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({ message: "Invitation sent successfully", invitation, userExists: false });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.get('/api/babies/:babyId/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === babyId);
      if (!hasBaby) {
        return res.status(403).json({ message: "Unauthorized access to this baby profile" });
      }
      
      const invitations = await storage.getPendingInvitationsByBaby(babyId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get('/api/invitations/pending', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !user.email) {
        return res.json([]);
      }
      
      const invitations = await storage.getPendingInvitationsByEmail(user.email);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  app.post('/api/invitations/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      await storage.acceptInvitation(id, userId);
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post('/api/invitations/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await storage.declineInvitation(id);
      res.json({ message: "Invitation declined" });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // Food routes
  app.get('/api/foods', async (req, res) => {
    try {
      const foods = await storage.getFoods();
      res.json(foods);
    } catch (error) {
      console.error("Error fetching foods:", error);
      res.status(500).json({ message: "Failed to fetch foods" });
    }
  });

  app.get('/api/foods/common', async (req, res) => {
    try {
      const foods = await storage.getCommonFoods();
      res.json(foods);
    } catch (error) {
      console.error("Error fetching common foods:", error);
      res.status(500).json({ message: "Failed to fetch common foods" });
    }
  });

  app.post('/api/foods', isAuthenticated, async (req: any, res) => {
    try {
      const foodData = req.body;
      
      // Check if food already exists
      const existingFood = await storage.getFoodByName(foodData.name);
      if (existingFood) {
        return res.json(existingFood);
      }
      
      const food = await storage.createFood(foodData);
      res.json(food);
    } catch (error) {
      console.error("Error creating food:", error);
      res.status(500).json({ message: "Failed to create food" });
    }
  });

  app.delete('/api/foods/:foodId', isAuthenticated, async (req: any, res) => {
    try {
      const { foodId } = req.params;
      await storage.deleteFood(foodId);
      res.json({ message: "Food deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting food:", error);
      if (error.message === "Cannot delete food with existing trials") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete food" });
    }
  });

  // Trial routes
  app.post('/api/trials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = createTrialSchema.parse(req.body);
      
      // Check active trials limit (max 3)
      const activeTrials = await storage.getTrialsByBaby(validatedData.babyId);
      const currentActiveTrials = activeTrials.filter(t => t.status === 'observing');
      
      if (currentActiveTrials.length >= 3) {
        return res.status(400).json({ 
          message: "Maximum 3 active observations allowed",
          details: "Testing multiple foods simultaneously can make it difficult to identify which food caused a reaction. Please complete or log reactions for current observations before starting a new one."
        });
      }
      
      // Calculate observation end date
      const trialDate = validatedData.trialDate; // Already a Date after schema transformation
      const observationEndsAt = new Date(trialDate);
      observationEndsAt.setDate(observationEndsAt.getDate() + validatedData.observationPeriodDays);
      
      const trial = await storage.createTrial({
        ...validatedData,
        userId,
        observationEndsAt,
      });
      
      // Schedule reminder notification
      await reminderService.scheduleObservationReminder(trial);
      
      res.json(trial);
    } catch (error) {
      console.error("Error creating trial:", error);
      res.status(500).json({ message: "Failed to create trial" });
    }
  });

  app.get('/api/babies/:babyId/trials', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const trials = await storage.getTrialsByBaby(babyId);
      res.json(trials);
    } catch (error) {
      console.error("Error fetching trials:", error);
      res.status(500).json({ message: "Failed to fetch trials" });
    }
  });

  app.patch('/api/trials/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const trial = await storage.getTrial(id);
      if (!trial) {
        return res.status(404).json({ message: "Trial not found" });
      }
      
      await storage.updateTrialStatus(id, "completed");
      
      // Create success brick log
      await storage.createBrickLog({
        babyId: trial.babyId,
        foodId: trial.foodId,
        trialId: id,
        type: "safe",
        date: new Date(),
      });
      
      res.json({ message: "Trial completed successfully" });
    } catch (error) {
      console.error("Error completing trial:", error);
      res.status(500).json({ message: "Failed to complete trial" });
    }
  });

  app.delete('/api/trials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const trial = await storage.getTrial(id);
      if (!trial) {
        return res.status(404).json({ message: "Trial not found" });
      }
      
      await storage.deleteTrial(id);
      res.json({ message: "Trial deleted successfully" });
    } catch (error) {
      console.error("Error deleting trial:", error);
      res.status(500).json({ message: "Failed to delete trial" });
    }
  });

  // Reaction routes
  app.post('/api/trials/:trialId/reactions', isAuthenticated, async (req: any, res) => {
    try {
      const { trialId } = req.params;
      const userId = req.user.claims.sub;
      const validatedData = createReactionSchema.parse(req.body);
      
      const trial = await storage.getTrial(trialId);
      if (!trial) {
        return res.status(404).json({ message: "Trial not found" });
      }
      
      const reaction = await storage.createReaction({
        ...validatedData,
        trialId,
        userId,
      });
      
      // Update trial status
      await storage.updateTrialStatus(trialId, "reaction");
      
      // Check brick history to determine what type of brick to add
      const previousBricks = await storage.getBrickLogsByFood(trial.babyId, trial.foodId);
      const hasSafeBricks = previousBricks.some(brick => brick.type === "safe");
      const hasWarningBricks = previousBricks.some(brick => brick.type === "warning");
      
      // Decision logic:
      // 1. If food was previously safe but has no warning bricks yet: add warning brick (first reaction after safe)
      // 2. If food has warning bricks already: add reaction brick (subsequent reactions)
      // 3. If food was never safe: add reaction brick (standard first reaction)
      let brickType: "warning" | "reaction";
      if (hasSafeBricks && !hasWarningBricks) {
        brickType = "warning";
      } else {
        brickType = "reaction";
      }
      
      await storage.createBrickLog({
        babyId: trial.babyId,
        foodId: trial.foodId,
        trialId,
        type: brickType,
        date: new Date(),
      });
      
      res.json(reaction);
    } catch (error) {
      console.error("Error creating reaction:", error);
      res.status(500).json({ message: "Failed to log reaction" });
    }
  });

  // Dashboard route
  app.get('/api/dashboard/:babyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { babyId } = req.params;
      
      const dashboardData = await storage.getDashboardData(userId, babyId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Email food report route
  app.post('/api/babies/:babyId/send-report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { babyId } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      // Validate email format
      const emailSchema = z.string().email();
      try {
        emailSchema.parse(email);
      } catch {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Get baby info
      const babies = await storage.getBabiesByUser(userId);
      const baby = babies.find(b => b.id === babyId);
      if (!baby) {
        return res.status(404).json({ message: "Baby not found" });
      }

      // Get dashboard data
      const dashboardData = await storage.getDashboardData(userId, babyId);

      // Initialize Resend
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Create HTML email content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #5C9EAD; border-bottom: 3px solid #5C9EAD; padding-bottom: 10px; }
            h2 { color: #5C9EAD; margin-top: 30px; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-card { flex: 1; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #5C9EAD; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #5C9EAD; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #ddd; }
            tr:hover { background: #f9f9f9; }
            .brick { display: inline-block; width: 20px; height: 15px; border-radius: 3px; margin-right: 3px; }
            .brick-safe { background: linear-gradient(135deg, #6FCF97 0%, #51B87E 100%); }
            .brick-warning { background: linear-gradient(135deg, #F2C94C 0%, #E0A826 100%); }
            .brick-reaction { background: linear-gradient(135deg, #EB5757 0%, #C94444 100%); }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>AllergyTrack Food Report for ${baby.name}</h1>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${dashboardData.stats.totalFoods}</div>
              <div class="stat-label">Total Foods Tested</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${dashboardData.stats.safeFoods}</div>
              <div class="stat-label">Foods that are safe</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${dashboardData.stats.foodAllergies}</div>
              <div class="stat-label">Reactions Logged</div>
            </div>
          </div>

          <h2>Food Trial History</h2>
          <table>
            <thead>
              <tr>
                <th>Food</th>
                <th>Trials</th>
                <th>Visual Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.foodProgress.map(food => {
                const safeBricks = food.bricks.filter(b => b.type === 'safe').length;
                const warningBricks = food.bricks.filter(b => b.type === 'warning').length;
                const reactionBricks = food.bricks.filter(b => b.type === 'reaction').length;
                const effectiveSafeBricks = Math.max(0, safeBricks - warningBricks);
                
                let status = 'Testing';
                if (reactionBricks >= 3) status = 'Confirmed allergy';
                else if (effectiveSafeBricks >= 3 && reactionBricks === 0) status = 'Safe food';
                else if (effectiveSafeBricks >= 3 && reactionBricks === 1) status = 'Caution';
                else if (effectiveSafeBricks >= 3 && reactionBricks >= 2) status = 'Likely allergy';
                else if (safeBricks === 1 && reactionBricks === 0) status = 'Passed once';
                else if (safeBricks === 2 && reactionBricks === 0) status = 'Building confidence';
                else if (safeBricks < 3 && reactionBricks === 1) status = 'Possible sensitivity';
                else if (safeBricks < 3 && reactionBricks >= 2) status = 'Allergy suspected';
                
                return `
                  <tr>
                    <td>${food.food.emoji || '🍼'} ${food.food.name}</td>
                    <td>${food.passCount + food.reactionCount} trials</td>
                    <td>
                      ${food.bricks.map(brick => 
                        `<span class="brick brick-${brick.type}"></span>`
                      ).join('')}
                    </td>
                    <td>${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated by AllergyTrack on ${new Date().toLocaleDateString('en-AU', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}.</p>
            <p><strong>Legend:</strong> 
              <span class="brick brick-safe"></span> Safe (no reaction) | 
              <span class="brick brick-warning"></span> Warning (first reaction after safe) | 
              <span class="brick brick-reaction"></span> Reaction
            </p>
          </div>
        </body>
        </html>
      `;

      // Send email
      await resend.emails.send({
        from: 'AllergyTrack <onboarding@resend.dev>',
        to: email,
        subject: `Food Allergy Report for ${baby.name}`,
        html: htmlContent,
      });

      res.json({ message: "Report sent successfully" });
    } catch (error) {
      console.error("Error sending report:", error);
      res.status(500).json({ message: "Failed to send report" });
    }
  });

  // Brick logs route
  app.get('/api/babies/:babyId/foods/:foodId/bricks', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, foodId } = req.params;
      const bricks = await storage.getBrickLogsByFood(babyId, foodId);
      res.json(bricks);
    } catch (error) {
      console.error("Error fetching brick logs:", error);
      res.status(500).json({ message: "Failed to fetch brick logs" });
    }
  });

  // Food history route (for notification logic)
  app.get('/api/babies/:babyId/foods/:foodId/history', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, foodId } = req.params;
      const history = await storage.getFoodHistory(babyId, foodId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching food history:", error);
      res.status(500).json({ message: "Failed to fetch food history" });
    }
  });

  // Get all trials for a specific food (with reactions and notes)
  app.get('/api/babies/:babyId/foods/:foodId/trials', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, foodId } = req.params;
      const trials = await storage.getTrialsByFood(babyId, foodId);
      res.json(trials);
    } catch (error) {
      console.error("Error fetching food trials:", error);
      res.status(500).json({ message: "Failed to fetch food trials" });
    }
  });

  app.delete('/api/babies/:babyId/foods/:foodId/latest-trial', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, foodId } = req.params;
      await storage.deleteLatestTrial(babyId, foodId);
      res.json({ message: "Latest trial deleted successfully" });
    } catch (error) {
      console.error("Error deleting latest trial:", error);
      res.status(500).json({ message: "Failed to delete latest trial" });
    }
  });

  app.delete('/api/babies/:babyId/foods/:foodId', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, foodId } = req.params;
      await storage.deleteFoodProgress(babyId, foodId);
      res.json({ message: "Food progress deleted successfully" });
    } catch (error) {
      console.error("Error deleting food progress:", error);
      res.status(500).json({ message: "Failed to delete food progress" });
    }
  });

  // Steroid cream routes
  app.post('/api/babies/:babyId/steroid-cream', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const userId = req.user.claims.sub;
      
      // Add babyId and startedAt to request body before validation
      const dataToValidate = {
        ...req.body,
        babyId,
        startedAt: new Date().toISOString(),
      };
      
      const validatedData = createSteroidCreamSchema.parse(dataToValidate);
      
      const cream = await storage.createSteroidCream({
        ...validatedData,
        userId,
      });
      
      res.json(cream);
    } catch (error) {
      console.error("Error starting steroid cream:", error);
      res.status(500).json({ message: "Failed to start steroid cream tracking" });
    }
  });

  app.get('/api/babies/:babyId/steroid-cream/active', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId } = req.params;
      const activeCream = await storage.getActiveSteroidCream(babyId);
      res.json(activeCream || null);
    } catch (error) {
      console.error("Error fetching active steroid cream:", error);
      res.status(500).json({ message: "Failed to fetch steroid cream status" });
    }
  });

  app.patch('/api/steroid-cream/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.endSteroidCream(id);
      res.json({ message: "Steroid cream tracking ended successfully" });
    } catch (error) {
      console.error("Error ending steroid cream:", error);
      res.status(500).json({ message: "Failed to end steroid cream tracking" });
    }
  });

  // Calendar routes
  app.get('/api/babies/:babyId/calendar/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const { babyId, year, month } = req.params;
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      
      const [steroidCreams, reactions] = await Promise.all([
        storage.getSteroidCreamsByMonth(babyId, yearNum, monthNum),
        storage.getReactionsByMonth(babyId, yearNum, monthNum),
      ]);
      
      res.json({ steroidCreams, reactions });
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // User settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Create default settings
        settings = await storage.upsertUserSettings({ userId });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settingsData = { ...req.body, userId };
      
      const settings = await storage.upsertUserSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // CSV Export route
  app.get('/api/babies/:babyId/export-csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { babyId } = req.params;

      // Check if user has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasBaby = babies.some(b => b.id === babyId);
      if (!hasBaby) {
        res.status(403).json({ message: "You do not have access to this baby" });
        return;
      }

      // Get baby details
      const baby = await storage.getBaby(babyId);
      if (!baby) {
        res.status(404).json({ message: "Baby not found" });
        return;
      }

      // Get all data
      const csvData = await storage.exportBabyDataToCSV(userId, babyId);
      
      // Format filename
      const fileName = `allergy-tracker-${baby.name.toLowerCase().replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send CSV
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Object storage routes for photo uploads
  // Referenced from blueprint:javascript_object_storage
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/reaction-photos", isAuthenticated, async (req: any, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    const userId = req.user.claims.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting reaction photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Setup cron job for reminders (runs every hour)
  cron.schedule('0 * * * *', () => {
    reminderService.processReminders().catch(console.error);
  });

  const httpServer = createServer(app);
  return httpServer;
}
