import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Baby profiles table
export const babies = pgTable("babies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: varchar("gender"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-baby relationships (for multi-parent access)
export const userBabies = pgTable("user_babies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  role: varchar("role").default("parent"), // parent, caregiver, doctor
  createdAt: timestamp("created_at").defaultNow(),
});

// Foods table
export const foods = pgTable("foods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  emoji: varchar("emoji"),
  category: varchar("category"), // dairy, grain, protein, etc.
  isCommon: boolean("is_common").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food trials table
export const trials = pgTable("trials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  foodId: varchar("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  trialDate: timestamp("trial_date").notNull(),
  observationPeriodDays: integer("observation_period_days").default(3),
  observationEndsAt: timestamp("observation_ends_at").notNull(),
  status: varchar("status").default("observing"), // observing, completed, reaction
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reaction severity and type enums
export const reactionSeverityEnum = pgEnum("reaction_severity", ["mild", "moderate", "severe"]);
export const reactionTypeEnum = pgEnum("reaction_type", [
  "itchiness", "redness", "rash", "hives", "diarrhea", "vomiting", "swelling", "other"
]);

// Food status enum
export const foodStatusEnum = pgEnum("food_status", ["testing", "safe", "insensitivity", "allergy"]);

// Reactions table
export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trialId: varchar("trial_id").notNull().references(() => trials.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  types: varchar("types").array(), // array of reaction types
  severity: reactionSeverityEnum("severity").notNull(),
  startedAt: timestamp("started_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brick logs table (for visualization)
export const brickLogs = pgTable("brick_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  foodId: varchar("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  trialId: varchar("trial_id").notNull().references(() => trials.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // "safe" or "reaction"
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food status tracking table (tracks status per baby-food combination)
export const foodStatus = pgTable("food_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  foodId: varchar("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  status: foodStatusEnum("status").notNull().default("testing"),
  passCount: integer("pass_count").notNull().default(0),
  reactionCount: integer("reaction_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  trialId: varchar("trial_id").references(() => trials.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // "observation_complete", "reminder", "reaction_alert"
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User settings table
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  defaultObservationPeriod: integer("default_observation_period").default(3),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  inAppNotifications: boolean("in_app_notifications").default(true),
  timezone: varchar("timezone").default("Australia/Sydney"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Steroid cream tracking table
export const steroidCream = pgTable("steroid_cream", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  babyId: varchar("baby_id").notNull().references(() => babies.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationDays: integer("default_days").default(3), // Maps to default_days column in DB
  notes: text("notes"),
  status: varchar("status").default("active"), // active, ended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userBabies: many(userBabies),
  trials: many(trials),
  reactions: many(reactions),
  notifications: many(notifications),
  settings: many(userSettings),
}));

export const babiesRelations = relations(babies, ({ many }) => ({
  userBabies: many(userBabies),
  trials: many(trials),
  brickLogs: many(brickLogs),
  notifications: many(notifications),
  foodStatuses: many(foodStatus),
}));

export const userBabiesRelations = relations(userBabies, ({ one }) => ({
  user: one(users, { fields: [userBabies.userId], references: [users.id] }),
  baby: one(babies, { fields: [userBabies.babyId], references: [babies.id] }),
}));

export const foodsRelations = relations(foods, ({ many }) => ({
  trials: many(trials),
  brickLogs: many(brickLogs),
  foodStatuses: many(foodStatus),
}));

export const trialsRelations = relations(trials, ({ one, many }) => ({
  baby: one(babies, { fields: [trials.babyId], references: [babies.id] }),
  food: one(foods, { fields: [trials.foodId], references: [foods.id] }),
  user: one(users, { fields: [trials.userId], references: [users.id] }),
  reactions: many(reactions),
  brickLogs: many(brickLogs),
  notifications: many(notifications),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  trial: one(trials, { fields: [reactions.trialId], references: [trials.id] }),
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

export const brickLogsRelations = relations(brickLogs, ({ one }) => ({
  baby: one(babies, { fields: [brickLogs.babyId], references: [babies.id] }),
  food: one(foods, { fields: [brickLogs.foodId], references: [foods.id] }),
  trial: one(trials, { fields: [brickLogs.trialId], references: [trials.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  baby: one(babies, { fields: [notifications.babyId], references: [babies.id] }),
  trial: one(trials, { fields: [notifications.trialId], references: [trials.id] }),
}));

export const foodStatusRelations = relations(foodStatus, ({ one }) => ({
  baby: one(babies, { fields: [foodStatus.babyId], references: [babies.id] }),
  food: one(foods, { fields: [foodStatus.foodId], references: [foods.id] }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertBaby = typeof babies.$inferInsert;
export type Baby = typeof babies.$inferSelect;

export type InsertUserBaby = typeof userBabies.$inferInsert;
export type UserBaby = typeof userBabies.$inferSelect;

export type InsertFood = typeof foods.$inferInsert;
export type Food = typeof foods.$inferSelect;

export type InsertTrial = typeof trials.$inferInsert;
export type Trial = typeof trials.$inferSelect;

export type InsertReaction = typeof reactions.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;

export type InsertBrickLog = typeof brickLogs.$inferInsert;
export type BrickLog = typeof brickLogs.$inferSelect;

export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

export type InsertUserSettings = typeof userSettings.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertFoodStatus = typeof foodStatus.$inferInsert;
export type FoodStatus = typeof foodStatus.$inferSelect;

export type InsertSteroidCream = typeof steroidCream.$inferInsert;
export type SteroidCream = typeof steroidCream.$inferSelect;

// Zod schemas
export const insertBabySchema = createInsertSchema(babies);
export const insertTrialSchema = createInsertSchema(trials);
export const insertReactionSchema = createInsertSchema(reactions);
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const insertSteroidCreamSchema = createInsertSchema(steroidCream);

// Extended schemas for API validation
export const createTrialSchema = insertTrialSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  observationEndsAt: true,
  userId: true
}).extend({
  observationPeriodDays: z.number().min(1).max(14).default(3),
  trialDate: z.string().transform((val) => new Date(val)),
});

export const createReactionSchema = insertReactionSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  trialId: true,
  userId: true
}).extend({
  types: z.array(z.string()).min(1),
  severity: z.enum(["mild", "moderate", "severe"]),
  startedAt: z.string().transform((val) => new Date(val)),
  resolvedAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const createSteroidCreamSchema = insertSteroidCreamSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  status: true,
  endedAt: true
}).extend({
  startedAt: z.string().transform((val) => new Date(val)),
  durationDays: z.number().min(1).max(30).default(3),
});
