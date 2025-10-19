import {
  users,
  babies,
  userBabies,
  pendingInvitations,
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
  type PendingInvitation,
  type InsertPendingInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Baby operations
  createBaby(baby: InsertBaby): Promise<Baby>;
  getBabiesByUser(userId: string): Promise<Baby[]>;
  getBaby(id: string): Promise<Baby | undefined>;
  updateBaby(id: string, updates: Partial<InsertBaby>): Promise<Baby>;
  
  // User-baby relationships
  addUserToBaby(userId: string, babyId: string, role?: string): Promise<void>;
  getUsersByBaby(babyId: string): Promise<Array<User & { role: string; addedAt: Date | null }>>;
  removeUserFromBaby(userId: string, babyId: string): Promise<void>;
  
  // Invitation operations
  createInvitation(invitation: InsertPendingInvitation): Promise<PendingInvitation>;
  getPendingInvitationsByBaby(babyId: string): Promise<Array<PendingInvitation & { invitedByUser: User }>>;
  getPendingInvitationsByEmail(email: string): Promise<Array<PendingInvitation & { baby: Baby; invitedByUser: User }>>;
  acceptInvitation(invitationId: string, userId: string): Promise<void>;
  declineInvitation(invitationId: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Food operations
  getFoods(): Promise<Food[]>;
  getCommonFoods(): Promise<Food[]>;
  createFood(food: InsertFood): Promise<Food>;
  getFoodByName(name: string): Promise<Food | undefined>;
  deleteFood(foodId: string): Promise<void>;
  
  // Trial operations
  createTrial(trial: InsertTrial): Promise<Trial>;
  getTrialsByBaby(babyId: string): Promise<(Trial & { food: Food })[]>;
  getTrial(id: string): Promise<Trial | undefined>;
  updateTrialStatus(id: string, status: string): Promise<void>;
  getTrialsByFood(babyId: string, foodId: string): Promise<Array<Trial & { reactions: Reaction[] }>>;
  
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
    hasConsecutiveRedBricks: boolean;
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
  
  // CSV Export operations
  exportBabyDataToCSV(userId: string, babyId: string): Promise<string>;
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

  async deleteUser(userId: string): Promise<void> {
    // Get all babies associated with this user
    const userBabiesResult = await db
      .select({ babyId: userBabies.babyId })
      .from(userBabies)
      .where(eq(userBabies.userId, userId));
    
    const babyIds = userBabiesResult.map(r => r.babyId);

    if (babyIds.length > 0) {
      // For each baby, check if it's shared with other users
      for (const babyId of babyIds) {
        // Count how many users are linked to this baby
        const otherUsersCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userBabies)
          .where(and(
            eq(userBabies.babyId, babyId),
            sql`${userBabies.userId} != ${userId}`
          ));
        
        const hasOtherUsers = Number(otherUsersCount[0]?.count || 0) > 0;
        
        // Only delete baby data if no other users are linked to this baby
        if (!hasOtherUsers) {
          // Get all trials for this baby
          const trialsResult = await db
            .select({ id: trials.id })
            .from(trials)
            .where(eq(trials.babyId, babyId));
          
          const trialIds = trialsResult.map(t => t.id);

          if (trialIds.length > 0) {
            // Delete all reactions for these trials
            await db.delete(reactions).where(inArray(reactions.trialId, trialIds));
            
            // Delete all brick logs for these trials
            await db.delete(brickLogs).where(inArray(brickLogs.trialId, trialIds));
            
            // Delete all trials
            await db.delete(trials).where(inArray(trials.id, trialIds));
          }

          // Delete steroid cream logs for this baby
          await db.delete(steroidCream).where(eq(steroidCream.babyId, babyId));

          // Delete the baby
          await db.delete(babies).where(eq(babies.id, babyId));
        }
      }
    }

    // Delete user-baby relationships for this user
    await db.delete(userBabies).where(eq(userBabies.userId, userId));
    
    // Delete notifications for this user
    await db.delete(notifications).where(eq(notifications.userId, userId));
    
    // Delete user settings
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    
    // Finally, delete the user
    await db.delete(users).where(eq(users.id, userId));
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

  async getUsersByBaby(babyId: string): Promise<Array<User & { role: string; addedAt: Date | null }>> {
    const result = await db
      .select({
        user: users,
        role: userBabies.role,
        addedAt: userBabies.createdAt,
      })
      .from(users)
      .innerJoin(userBabies, eq(users.id, userBabies.userId))
      .where(eq(userBabies.babyId, babyId))
      .orderBy(userBabies.createdAt);
    
    return result.map(r => ({ ...r.user, role: r.role || 'parent', addedAt: r.addedAt }));
  }

  async removeUserFromBaby(userId: string, babyId: string): Promise<void> {
    await db
      .delete(userBabies)
      .where(and(
        eq(userBabies.userId, userId),
        eq(userBabies.babyId, babyId)
      ));
  }

  // Invitation operations
  async createInvitation(invitation: InsertPendingInvitation): Promise<PendingInvitation> {
    const [newInvitation] = await db
      .insert(pendingInvitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getPendingInvitationsByBaby(babyId: string): Promise<Array<PendingInvitation & { invitedByUser: User }>> {
    const result = await db
      .select({
        invitation: pendingInvitations,
        invitedByUser: users,
      })
      .from(pendingInvitations)
      .innerJoin(users, eq(pendingInvitations.invitedByUserId, users.id))
      .where(and(
        eq(pendingInvitations.babyId, babyId),
        eq(pendingInvitations.status, 'pending')
      ));
    
    return result.map(r => ({ ...r.invitation, invitedByUser: r.invitedByUser }));
  }

  async getPendingInvitationsByEmail(email: string): Promise<Array<PendingInvitation & { baby: Baby; invitedByUser: User }>> {
    const result = await db
      .select({
        invitation: pendingInvitations,
        baby: babies,
        invitedByUser: users,
      })
      .from(pendingInvitations)
      .innerJoin(babies, eq(pendingInvitations.babyId, babies.id))
      .innerJoin(users, eq(pendingInvitations.invitedByUserId, users.id))
      .where(and(
        eq(pendingInvitations.invitedEmail, email),
        eq(pendingInvitations.status, 'pending')
      ));
    
    return result.map(r => ({ ...r.invitation, baby: r.baby, invitedByUser: r.invitedByUser }));
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    const [invitation] = await db
      .select()
      .from(pendingInvitations)
      .where(eq(pendingInvitations.id, invitationId));
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Add user to baby
    await this.addUserToBaby(userId, invitation.babyId, invitation.role || 'parent');

    // Mark invitation as accepted
    await db
      .update(pendingInvitations)
      .set({ status: 'accepted' })
      .where(eq(pendingInvitations.id, invitationId));
  }

  async declineInvitation(invitationId: string): Promise<void> {
    await db
      .update(pendingInvitations)
      .set({ status: 'declined' })
      .where(eq(pendingInvitations.id, invitationId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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

  async deleteFood(foodId: string): Promise<void> {
    // Check if there are any trials for this food
    const existingTrials = await db.select().from(trials).where(eq(trials.foodId, foodId));
    if (existingTrials.length > 0) {
      throw new Error("Cannot delete food with existing trials");
    }
    
    // Delete the food if no trials exist
    await db.delete(foods).where(eq(foods.id, foodId));
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

  async getTrialsByFood(babyId: string, foodId: string): Promise<Array<Trial & { reactions: Reaction[] }>> {
    const trialsData = await db
      .select()
      .from(trials)
      .where(and(eq(trials.babyId, babyId), eq(trials.foodId, foodId)))
      .orderBy(desc(trials.trialDate));
    
    // Get reactions for each trial
    const trialsWithReactions = await Promise.all(
      trialsData.map(async (trial) => {
        const trialReactions = await this.getReactionsByTrial(trial.id);
        return {
          ...trial,
          reactions: trialReactions,
        };
      })
    );
    
    return trialsWithReactions;
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
    hasConsecutiveRedBricks: boolean;
  }> {
    // Get all brick logs for this food
    const bricks = await this.getBrickLogsByFood(babyId, foodId);
    
    // Count red bricks (type='reaction')
    const redBrickCount = bricks.filter(b => b.type === 'reaction').length;
    
    // Check for 3 consecutive red bricks
    // This counts either: (1) 3 consecutive reds OR (2) 1 amber + 3 consecutive reds
    let hasConsecutiveRedBricks = false;
    let consecutiveReds = 0;
    let foundAmber = false;
    
    for (const brick of bricks) {
      if (brick.type === 'warning') {
        foundAmber = true;
        consecutiveReds = 0; // Reset red counter when we find amber
      } else if (brick.type === 'reaction') {
        consecutiveReds++;
        if (consecutiveReds >= 3) {
          hasConsecutiveRedBricks = true;
          break;
        }
      } else {
        // Safe brick resets everything
        consecutiveReds = 0;
        foundAmber = false;
      }
    }
    
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
      hasConsecutiveRedBricks,
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

    // Get steroid cream activity
    const steroidCreamRecords = await db
      .select()
      .from(steroidCream)
      .where(eq(steroidCream.babyId, babyId))
      .orderBy(desc(steroidCream.createdAt))
      .limit(10);

    // Build recent activity with enhanced descriptions
    const trialActivity = await Promise.all(recentTrials.map(async r => {
      let description = '';
      let type = 'info';
      
      if (r.trial.status === "completed") {
        description = `${r.food.name} trial completed successfully`;
        type = 'success';
      } else if (r.trial.status === "reaction") {
        // Get food history to determine if it's a confirmed/likely allergy
        const history = await this.getFoodHistory(babyId, r.food.id);
        
        // Check for confirmed or likely allergy
        if (history.hasConsecutiveRedBricks || history.highestSeverity === 'moderate' || history.highestSeverity === 'severe') {
          if (history.highestSeverity === 'moderate' || history.highestSeverity === 'severe') {
            description = `Confirmed allergy to ${r.food.name}`;
          } else {
            description = `Likely allergy to ${r.food.name}`;
          }
        } else {
          description = `Reaction to ${r.food.name} logged`;
        }
        type = 'error';
      } else {
        description = `Started ${r.food.name} trial observation`;
        type = 'info';
      }
      
      return {
        id: r.trial.id,
        description,
        timestamp: r.trial.updatedAt!,
        type,
      };
    }));

    // Add steroid cream activity
    const creamActivity = steroidCreamRecords.map(cream => {
      const isEnded = cream.status === 'ended';
      return {
        id: `cream-${cream.id}`,
        description: isEnded 
          ? `Steroid cream treatment ended (${cream.durationDays}-day treatment)`
          : `Steroid cream treatment started (${cream.durationDays}-day treatment)`,
        timestamp: isEnded && cream.endedAt ? cream.endedAt : cream.createdAt!,
        type: 'info',
      };
    });

    // Combine and sort all activity by timestamp
    const recentActivity = [...trialActivity, ...creamActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

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

  async exportBabyDataToCSV(userId: string, babyId: string): Promise<string> {
    // Get baby details
    const baby = await this.getBaby(babyId);
    if (!baby) {
      throw new Error("Baby not found");
    }

    // Fetch all data in a single query with joins
    const dataResult = await db.execute(sql`
      SELECT 
        b.name AS baby_name,
        b.date_of_birth AS baby_dob,
        f.name AS food_name,
        f.emoji AS food_emoji,
        t.trial_date,
        t.observation_ends_at,
        t.status AS trial_status,
        t.notes AS trial_notes,
        bl.type AS brick_type,
        bl.date AS brick_date,
        r.types AS reaction_types,
        r.severity AS reaction_severity,
        r.started_at AS reaction_started,
        r.resolved_at AS reaction_resolved,
        r.notes AS reaction_notes,
        sc.started_at AS steroid_started,
        sc.ended_at AS steroid_ended,
        sc.notes AS steroid_notes
      FROM ${trials} t
      JOIN ${babies} b ON t.baby_id = b.id
      JOIN ${foods} f ON t.food_id = f.id
      LEFT JOIN ${brickLogs} bl ON t.id = bl.trial_id
      LEFT JOIN ${reactions} r ON t.id = r.trial_id
      LEFT JOIN ${steroidCream} sc 
        ON sc.baby_id = b.id 
        AND t.trial_date BETWEEN sc.started_at AND COALESCE(sc.ended_at, NOW())
      WHERE b.id = ${babyId}
      ORDER BY t.trial_date ASC, bl.date ASC
    `);

    const rows = dataResult.rows as any[];

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format dates
    const formatDate = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' });
    };

    const formatDateTime = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    };

    // Create CSV header (removed: Baby Name, Baby Date of Birth, Food Emoji)
    const headers = [
      'Food Name',
      'Trial Start Date',
      'Trial End Date',
      'Trial Status',
      'Brick Type',
      'Brick Date',
      'Reaction Types',
      'Reaction Severity',
      'Reaction Started',
      'Reaction Resolved',
      'Reaction Notes',
      'Trial Notes',
      'Steroid Cream Started',
      'Steroid Cream Ended',
      'Steroid Cream Notes'
    ];

    const csvLines = [headers.join(',')];

    // Add data rows
    rows.forEach(row => {
      // Transform trial status: 'completed' -> 'passed'
      const trialStatus = row.trial_status === 'completed' ? 'passed' : row.trial_status;
      
      // Transform brick type: 'warning' -> 'reaction'
      const brickType = row.brick_type === 'warning' ? 'reaction' : row.brick_type;
      
      const line = [
        escapeCSV(row.food_name),
        escapeCSV(formatDate(row.trial_date)),
        escapeCSV(formatDate(row.observation_ends_at)),
        escapeCSV(trialStatus),
        escapeCSV(brickType),
        escapeCSV(formatDate(row.brick_date)),
        escapeCSV(Array.isArray(row.reaction_types) ? row.reaction_types.join(', ') : row.reaction_types),
        escapeCSV(row.reaction_severity),
        escapeCSV(formatDateTime(row.reaction_started)),
        escapeCSV(formatDateTime(row.reaction_resolved)),
        escapeCSV(row.reaction_notes),
        escapeCSV(row.trial_notes),
        escapeCSV(formatDateTime(row.steroid_started)),
        escapeCSV(formatDateTime(row.steroid_ended)),
        escapeCSV(row.steroid_notes)
      ];
      csvLines.push(line.join(','));
    });

    // Add summary header at the top
    const today = new Date();
    const summary = `Allergy Tracker for Bubs - Export for ${baby.name} - Generated: ${formatDateTime(today)} - Total Records: ${rows.length}`;
    csvLines.unshift('');
    csvLines.unshift(summary);

    return csvLines.join('\n');
  }
}

export const storage = new DatabaseStorage();
