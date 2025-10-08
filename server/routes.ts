import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { createTrialSchema, createReactionSchema, createSteroidCreamSchema, type InsertBaby } from "@shared/schema";
import { z } from "zod";
import cron from "node-cron";
import { reminderService } from "./services/reminder-service";

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
      
      // Update trial status and create reaction brick log
      await storage.updateTrialStatus(trialId, "reaction");
      await storage.createBrickLog({
        babyId: trial.babyId,
        foodId: trial.foodId,
        trialId,
        type: "reaction",
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

  // Setup cron job for reminders (runs every hour)
  cron.schedule('0 * * * *', () => {
    reminderService.processReminders().catch(console.error);
  });

  const httpServer = createServer(app);
  return httpServer;
}
