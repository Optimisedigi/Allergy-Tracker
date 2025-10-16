import {
  users,
  babies,
  userBabies,
  foods,
  trials,
  reactions,
  brickLogs,
  notifications,
  userSettings,
  steroidCream,
  type User,
  type UpsertUser,
  type Baby,
  type InsertBaby,
  type Food,
  type InsertFood,
  type Trial,
  type InsertTrial,
  type Reaction,
  type InsertReaction,
  type BrickLog,
  type InsertBrickLog,
  type Notification,
  type InsertNotification,
  type UserSettings,
  type InsertUserSettings,
  type SteroidCream,
  type InsertSteroidCream,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Baby operations
  createBaby(baby: InsertBaby): Promise<Baby>;
  getBabiesByUser(userId: string): Promise<Baby[]>;
  getBaby(id: string): Promise<Baby | undefined>;
  updateBaby(id: string, updates: Partial<InsertBaby>): Promise<Baby>;
  
  // User-baby relationships
  addUserToBaby(userId: string, babyId: string, role?: string): Promise<void>;
  
  // Food operations
  getFoods(): Promise<Food[]>;
  getCommonFoods(): Promise<Food[]>;
  createFood(food: InsertFood): Promise<Food>;
  getFoodByName(name: string): Promise<Food | undefined>;
  
  // Trial operations
  createTrial(trial: InsertTrial): Promise<Trial>;
  getTrialsByBaby(babyId: string): Promise<(Trial & { food: Food })[]>;
  getTrial(id: string): Promise<Trial | undefined>;
  updateTrialStatus(id: string, status: string): Promise<void>;
  
  // Reaction operations
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  getReactionsByTrial(trialId: string): Promise<Reaction[]>;
  
  // Brick log operations
  createBrickLog(brickLog: InsertBrickLog): Promise<BrickLog>;
  getBrickLogsByFood(babyId: string, foodId: string): Promise<BrickLog[]>;
  getFoodHistory(babyId: string, foodId: string): Promise<{
    redBrickCount: number;
    reactionsInLastThreeTrials: number;
    highestSeverity: 'mild' | 'moderate' | 'severe' | null;
  }>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  // Dashboard data
  getDashboardData(userId: string, babyId: string): Promise<{
    stats: { totalFoods: number; safeFoods: number; foodAllergies: number };
    activeTrials: (Trial & { food: Food })[];
    recentActivity: Array<{
      id: string;
      description: string;
      timestamp: Date;
      type: string;
    }>;
    foodProgress: Array<{
      food: Food;
      bricks: Array<{ type: string; date: string }>;
      passCount: number;
      reactionCount: number;
      lastTrial: Date | null;
    }>;
  }>;
  deleteFoodProgress(babyId: string, foodId: string): Promise<void>;
  deleteLatestTrial(babyId: string, foodId: string): Promise<void>;
  
  // Steroid cream operations
  createSteroidCream(cream: InsertSteroidCream): Promise<SteroidCream>;
  getActiveSteroidCream(babyId: string): Promise<SteroidCream | undefined>;
  endSteroidCream(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Baby operations
  async createBaby(baby: InsertBaby): Promise<Baby> {
    const [newBaby] = await db.insert(babies).values(baby).returning();
    return newBaby;
  }

  async getBabiesByUser(userId: string): Promise<Baby[]> {
    const result = await db
      .select({ baby: babies })
      .from(babies)
      .innerJoin(userBabies, eq(babies.id, userBabies.babyId))
      .where(eq(userBabies.userId, userId));
    
    return result.map(r => r.baby);
  }

  async getBaby(id: string): Promise<Baby | undefined> {
    const [baby] = await db.select().from(babies).where(eq(babies.id, id));
    return baby;
  }

  async updateBaby(id: string, updates: Partial<InsertBaby>): Promise<Baby> {
    const [updatedBaby] = await db
      .update(babies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(babies.id, id))
      .returning();
    return updatedBaby;
  }

  async addUserToBaby(userId: string, babyId: string, role: string = "parent"): Promise<void> {
    await db.insert(userBabies).values({
      userId,
      babyId,
      role,
    });
  }

  // Food operations
  async getFoods(): Promise<Food[]> {
    return db.select().from(foods).orderBy(foods.name);
  }

  async getCommonFoods(): Promise<Food[]> {
    return db.select().from(foods).where(eq(foods.isCommon, true)).orderBy(foods.name);
  }

  async createFood(food: InsertFood): Promise<Food> {
    const [newFood] = await db.insert(foods).values(food).returning();
    return newFood;
  }

  async getFoodByName(name: string): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(eq(foods.name, name));
    return food;
  }

  // Trial operations
  async createTrial(trial: InsertTrial): Promise<Trial> {
    const [newTrial] = await db.insert(trials).values(trial).returning();
    return newTrial;
  }

  async getTrialsByBaby(babyId: string): Promise<(Trial & { food: Food })[]> {
    const result = await db
      .select({
        trial: trials,
        food: foods,
      })
      .from(trials)
      .innerJoin(foods, eq(trials.foodId, foods.id))
      .where(eq(trials.babyId, babyId))
      .orderBy(desc(trials.trialDate));
    
    return result.map(r => ({ ...r.trial, food: r.food }));
  }

  async getTrial(id: string): Promise<Trial | undefined> {
    const [trial] = await db.select().from(trials).where(eq(trials.id, id));
    return trial;
  }

  async updateTrialStatus(id: string, status: string): Promise<void> {
    await db.update(trials).set({ status }).where(eq(trials.id, id));
  }

  async deleteTrial(id: string): Promise<void> {
    await db.delete(trials).where(eq(trials.id, id));
  }

  // Reaction operations
  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const [newReaction] = await db.insert(reactions).values(reaction).returning();
    return newReaction;
  }

  async getReactionsByTrial(trialId: string): Promise<Reaction[]> {
    return db.select().from(reactions).where(eq(reactions.trialId, trialId));
  }

  // Brick log operations
  async createBrickLog(brickLog: InsertBrickLog): Promise<BrickLog> {
    const [newBrickLog] = await db.insert(brickLogs).values(brickLog).returning();
    return newBrickLog;
  }

  async getBrickLogsByFood(babyId: string, foodId: string): Promise<BrickLog[]> {
    return db
      .select()
      .from(brickLogs)
      .where(and(eq(brickLogs.babyId, babyId), eq(brickLogs.foodId, foodId)))
      .orderBy(brickLogs.date);
  }

  async getFoodHistory(babyId: string, foodId: string): Promise<{
    redBrickCount: number;
    reactionsInLastThreeTrials: number;
    highestSeverity: 'mild' | 'moderate' | 'severe' | null;
  }> {
    // Get all brick logs for this food
    const bricks = await this.getBrickLogsByFood(babyId, foodId);
    
    // Count red bricks (type='reaction')
    const redBrickCount = bricks.filter(b => b.type === 'reaction').length;
    
    // Get last 3 trials and count reactions in them
    const last3Bricks = bricks.slice(-3);
    const reactionsInLastThreeTrials = last3Bricks.filter(
      b => b.type === 'reaction' || b.type === 'warning'
    ).length;
    
    // Get all trials for this baby and food to fetch reaction severity
    const trialsData = await db
      .select()
      .from(trials)
      .where(and(eq(trials.babyId, babyId), eq(trials.foodId, foodId)));
    
    // Get all reactions for these trials
    const trialIds = trialsData.map(t => t.id);
    let highestSeverity: 'mild' | 'moderate' | 'severe' | null = null;
    
    if (trialIds.length > 0) {
      const allReactions = await db
        .select()
        .from(reactions)
        .where(
          trialIds.length === 1 
            ? eq(reactions.trialId, trialIds[0])
            : sql`${reactions.trialId} IN ${trialIds}`
        );
      
      // Determine highest severity
      const severityOrder = { severe: 3, moderate: 2, mild: 1 };
      for (const reaction of allReactions) {
        if (!highestSeverity || severityOrder[reaction.severity] > severityOrder[highestSeverity]) {
          highestSeverity = reaction.severity;
        }
      }
    }
    
    return {
      redBrickCount,
      reactionsInLastThreeTrials,
      highestSeverity,
    };
  }

  async deleteFoodProgress(babyId: string, foodId: string): Promise<void> {
    await db.delete(trials).where(and(eq(trials.babyId, babyId), eq(trials.foodId, foodId)));
  }

  async deleteLatestTrial(babyId: string, foodId: string): Promise<void> {
    // Get the latest trial for this food
    const latestTrial = await db
      .select()
      .from(trials)
      .where(and(eq(trials.babyId, babyId), eq(trials.foodId, foodId)))
      .orderBy(desc(trials.trialDate))
      .limit(1);
    
    if (latestTrial.length > 0) {
      const trialId = latestTrial[0].id;
      
      // Delete associated brick logs
      await db.delete(brickLogs).where(eq(brickLogs.trialId, trialId));
      
      // Delete associated reactions
      await db.delete(reactions).where(eq(reactions.trialId, trialId));
      
      // Delete the trial itself
      await db.delete(trials).where(eq(trials.id, trialId));
    }
  }

  // Steroid cream operations
  async createSteroidCream(cream: InsertSteroidCream): Promise<SteroidCream> {
    const [newCream] = await db.insert(steroidCream).values(cream).returning();
    return newCream;
  }

  async getActiveSteroidCream(babyId: string): Promise<SteroidCream | undefined> {
    const [activeCream] = await db
      .select()
      .from(steroidCream)
      .where(and(eq(steroidCream.babyId, babyId), eq(steroidCream.status, "active")))
      .orderBy(desc(steroidCream.createdAt))
      .limit(1);
    return activeCream;
  }

  async endSteroidCream(id: string): Promise<void> {
    await db
      .update(steroidCream)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(steroidCream.id, id));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [upsertedSettings] = await db
      .insert(userSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedSettings;
  }

  // Dashboard data
  async getDashboardData(userId: string, babyId: string) {
    // Get stats with new logic:
    // - Safe Foods: foods with 3+ safe bricks (warning bricks neutralize 1 safe brick each)
    // - Food Allergies: foods with 2+ reaction bricks
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT t.food_id) as total_foods,
        COUNT(DISTINCT CASE 
          WHEN safe_count - warning_count >= 3 THEN f.id 
        END) as safe_foods,
        COUNT(DISTINCT CASE 
          WHEN reaction_count >= 2 THEN f.id 
        END) as food_allergies
      FROM ${trials} t
      JOIN ${foods} f ON t.food_id = f.id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(CASE WHEN bl.type = 'safe' THEN 1 END) as safe_count,
          COUNT(CASE WHEN bl.type = 'warning' THEN 1 END) as warning_count,
          COUNT(CASE WHEN bl.type = 'reaction' THEN 1 END) as reaction_count
        FROM ${brickLogs} bl
        WHERE bl.food_id = t.food_id AND bl.baby_id = ${babyId}
      ) brick_counts ON true
      WHERE t.baby_id = ${babyId}
    `);

    const stats = statsResult.rows[0] || { total_foods: 0, safe_foods: 0, food_allergies: 0 };
    const formattedStats = {
      totalFoods: Number(stats.total_foods) || 0,
      safeFoods: Number(stats.safe_foods) || 0,
      foodAllergies: Number(stats.food_allergies) || 0,
    };

    // Get active trials (currently observing)
    const activeTrials = await db
      .select({
        trial: trials,
        food: foods,
      })
      .from(trials)
      .innerJoin(foods, eq(trials.foodId, foods.id))
      .where(and(
        eq(trials.babyId, babyId),
        eq(trials.status, "observing")
      ))
      .orderBy(trials.observationEndsAt);

    // Get recent activity
    const recentTrials = await db
      .select({
        trial: trials,
        food: foods,
      })
      .from(trials)
      .innerJoin(foods, eq(trials.foodId, foods.id))
      .where(eq(trials.babyId, babyId))
      .orderBy(desc(trials.updatedAt))
      .limit(10);

    const recentActivity = recentTrials.map(r => ({
      id: r.trial.id,
      description: r.trial.status === "completed" 
        ? `${r.food.name} trial completed successfully`
        : r.trial.status === "reaction"
        ? `Reaction to ${r.food.name} logged`
        : `Started ${r.food.name} trial observation`,
      timestamp: r.trial.updatedAt!,
      type: r.trial.status === "completed" ? "success" : r.trial.status === "reaction" ? "error" : "info",
    }));

    // Get food progress with brick logs (using lateral join for proper parameter binding)
    const foodProgressResult = await db.execute(sql`
      SELECT 
        f.*,
        COALESCE(brick_data.bricks, '[]'::json) as bricks,
        COALESCE(brick_data.pass_count, 0) as pass_count,
        COALESCE(brick_data.reaction_count, 0) as reaction_count,
        trial_data.last_trial
      FROM ${foods} f
      CROSS JOIN LATERAL (
        SELECT 
          json_agg(json_build_object('type', bl.type, 'date', bl.date) ORDER BY bl.date) as bricks,
          COUNT(DISTINCT CASE WHEN bl.type = 'safe' THEN bl.id END) as pass_count,
          COUNT(DISTINCT CASE WHEN bl.type = 'reaction' THEN bl.id END) as reaction_count
        FROM ${brickLogs} bl
        WHERE bl.food_id = f.id AND bl.baby_id = ${babyId}
      ) brick_data
      CROSS JOIN LATERAL (
        SELECT MAX(t.trial_date) as last_trial
        FROM ${trials} t
        WHERE t.food_id = f.id AND t.baby_id = ${babyId}
      ) trial_data
      WHERE EXISTS (
        SELECT 1 FROM ${trials} t2 
        WHERE t2.food_id = f.id AND t2.baby_id = ${babyId}
      )
      ORDER BY trial_data.last_trial DESC NULLS LAST
    `);

    const foodProgress = (foodProgressResult.rows as any[]).map((r: any) => {
      let bricks: Array<{ type: string; date: string }> = [];
      
      // Parse bricks data (can be array or JSON string depending on Postgres driver)
      if (r.bricks) {
        if (Array.isArray(r.bricks)) {
          bricks = r.bricks;
        } else if (typeof r.bricks === 'string') {
          try {
            const parsed = JSON.parse(r.bricks);
            bricks = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('Failed to parse bricks JSON:', e);
          }
        }
      }
      
      // Reconstruct food object from query result
      const food: Food = {
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        category: r.category,
        isCommon: r.is_common,
        createdAt: r.created_at,
      };
      
      return {
        food,
        bricks,
        passCount: Number(r.pass_count) || 0,
        reactionCount: Number(r.reaction_count) || 0,
        lastTrial: r.last_trial,
      };
    });

    return {
      stats: formattedStats,
      activeTrials: activeTrials.map(r => ({ ...r.trial, food: r.food })),
      recentActivity,
      foodProgress,
    };
  }
}

export const storage = new DatabaseStorage();
