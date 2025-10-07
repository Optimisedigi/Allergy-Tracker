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

  async deleteFoodProgress(babyId: string, foodId: string): Promise<void> {
    await db.delete(trials).where(and(eq(trials.babyId, babyId), eq(trials.foodId, foodId)));
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
    // Get stats
    const statsResult = await db
      .select({
        totalFoods: sql<number>`count(distinct ${trials.foodId})`,
        safeFoods: sql<number>`count(case when ${brickLogs.type} = 'safe' then 1 end)`,
        foodAllergies: sql<number>`count(case when ${brickLogs.type} = 'reaction' then 1 end)`,
      })
      .from(trials)
      .leftJoin(brickLogs, eq(trials.id, brickLogs.trialId))
      .where(eq(trials.babyId, babyId));

    const stats = statsResult[0] || { totalFoods: 0, safeFoods: 0, foodAllergies: 0 };

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

    // Get food progress with brick logs
    const foodProgressResult = await db
      .select({
        food: foods,
        bricks: sql<Array<{type: string, date: string}>>`
          COALESCE(
            json_agg(
              json_build_object('type', ${brickLogs.type}, 'date', ${brickLogs.date})
              ORDER BY ${brickLogs.date}
            ) FILTER (WHERE ${brickLogs.id} IS NOT NULL),
            '[]'::json
          )
        `,
        passCount: sql<number>`count(distinct case when ${brickLogs.type} = 'safe' then ${brickLogs.id} end)`,
        reactionCount: sql<number>`count(distinct case when ${brickLogs.type} = 'reaction' then ${brickLogs.id} end)`,
        lastTrial: sql<Date>`max(${trials.trialDate})`,
      })
      .from(foods)
      .leftJoin(trials, and(eq(foods.id, trials.foodId), eq(trials.babyId, babyId)))
      .leftJoin(brickLogs, and(eq(foods.id, brickLogs.foodId), eq(brickLogs.babyId, babyId)))
      .where(sql`exists (select 1 from ${trials} where ${trials.foodId} = ${foods.id} and ${trials.babyId} = ${babyId})`)
      .groupBy(foods.id)
      .orderBy(desc(sql`max(${trials.trialDate})`));

    const foodProgress = foodProgressResult.map(r => ({
      food: r.food,
      bricks: Array.isArray(r.bricks) ? r.bricks : [],
      passCount: r.passCount || 0,
      reactionCount: r.reactionCount || 0,
      lastTrial: r.lastTrial,
    }));

    return {
      stats,
      activeTrials: activeTrials.map(r => ({ ...r.trial, food: r.food })),
      recentActivity,
      foodProgress,
    };
  }
}

export const storage = new DatabaseStorage();
