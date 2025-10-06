import { db } from "./db";
import { foods } from "@shared/schema";
import { sql } from "drizzle-orm";

const COMMON_FOODS = [
  { name: "Milk", emoji: "🥛", category: "dairy", isCommon: true },
  { name: "Egg", emoji: "🥚", category: "protein", isCommon: true },
  { name: "Wheat", emoji: "🌾", category: "grain", isCommon: true },
  { name: "Peanut", emoji: "🥜", category: "protein", isCommon: true },
  { name: "Shellfish", emoji: "🦐", category: "protein", isCommon: true },
  { name: "Fish", emoji: "🐟", category: "protein", isCommon: true },
  { name: "Soy", emoji: "🫘", category: "protein", isCommon: true },
  { name: "Tree Nuts", emoji: "🌰", category: "protein", isCommon: true },
  { name: "Sesame", emoji: "🫴", category: "grain", isCommon: true },
  { name: "Banana", emoji: "🍌", category: "fruit", isCommon: true },
  { name: "Apple", emoji: "🍎", category: "fruit", isCommon: true },
  { name: "Avocado", emoji: "🥑", category: "fruit", isCommon: true },
  { name: "Strawberry", emoji: "🍓", category: "fruit", isCommon: true },
  { name: "Rice", emoji: "🍚", category: "grain", isCommon: true },
  { name: "Oats", emoji: "🌾", category: "grain", isCommon: true },
  { name: "Chicken", emoji: "🍗", category: "protein", isCommon: true },
  { name: "Beef", emoji: "🥩", category: "protein", isCommon: true },
  { name: "Carrot", emoji: "🥕", category: "vegetable", isCommon: true },
  { name: "Broccoli", emoji: "🥦", category: "vegetable", isCommon: true },
  { name: "Sweet Potato", emoji: "🍠", category: "vegetable", isCommon: true },
];

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    console.log("📦 Checking for existing foods...");
    const existingFoods = await db.select().from(foods);

    if (existingFoods.length === 0) {
      console.log("🍼 Inserting common foods...");
      await db.insert(foods).values(COMMON_FOODS);
      console.log(`✅ Inserted ${COMMON_FOODS.length} common foods`);
    } else {
      console.log(`ℹ️  Database already contains ${existingFoods.length} foods, skipping seed`);
    }

    console.log("✨ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
