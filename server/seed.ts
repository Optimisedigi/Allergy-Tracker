import { db } from "./db";
import { foods } from "@shared/schema";
import { sql } from "drizzle-orm";

const COMMON_FOODS = [
  // Iron-rich foods - Proteins (meats & fish)
  { name: "Beef", emoji: "🥩", category: "protein", isCommon: true },
  { name: "Chicken", emoji: "🍗", category: "protein", isCommon: true },
  { name: "Lamb", emoji: "🍖", category: "protein", isCommon: false },
  { name: "Pork", emoji: "🥓", category: "protein", isCommon: false },
  { name: "Turkey", emoji: "🦃", category: "protein", isCommon: false },
  { name: "Salmon", emoji: "🐟", category: "protein", isCommon: true },
  { name: "Sardines", emoji: "🐟", category: "protein", isCommon: false },
  { name: "Tuna", emoji: "🐟", category: "protein", isCommon: true },
  { name: "White fish", emoji: "🐟", category: "protein", isCommon: false },
  { name: "Shellfish", emoji: "🦐", category: "protein", isCommon: true },
  { name: "Prawns", emoji: "🦐", category: "protein", isCommon: true },
  { name: "Crab", emoji: "🦀", category: "protein", isCommon: true },
  { name: "Egg", emoji: "🥚", category: "protein", isCommon: true },
  { name: "Tofu", emoji: "🫘", category: "protein", isCommon: false },
  
  // Iron-rich foods - Nuts & Seeds
  { name: "Almonds", emoji: "🌰", category: "protein", isCommon: true },
  { name: "Brazil nuts", emoji: "🌰", category: "protein", isCommon: false },
  { name: "Cashews", emoji: "🌰", category: "protein", isCommon: true },
  { name: "Peanut", emoji: "🥜", category: "protein", isCommon: true },
  { name: "Pistachio", emoji: "🥜", category: "protein", isCommon: false },
  { name: "Pecans", emoji: "🌰", category: "protein", isCommon: true },
  { name: "Chia seeds", emoji: "🌾", category: "grain", isCommon: false },
  { name: "Hemp seeds", emoji: "🌾", category: "grain", isCommon: false },
  { name: "Pumpkin seeds", emoji: "🎃", category: "grain", isCommon: false },
  { name: "Sunflower seeds", emoji: "🌻", category: "grain", isCommon: false },
  { name: "Sesame", emoji: "🫴", category: "grain", isCommon: true },
  { name: "Tahini", emoji: "🫴", category: "grain", isCommon: true },
  
  // Iron-rich foods - Legumes
  { name: "Black beans", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Butterbeans", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Cannelini beans", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Chickpeas", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Kidney beans", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Lentils", emoji: "🫘", category: "legume", isCommon: false },
  { name: "Soy", emoji: "🫘", category: "protein", isCommon: true },
  
  // Vegetables
  { name: "Asparagus", emoji: "🥬", category: "vegetable", isCommon: false },
  { name: "Beetroot", emoji: "🫚", category: "vegetable", isCommon: false },
  { name: "Broccoli", emoji: "🥦", category: "vegetable", isCommon: true },
  { name: "Cabbage", emoji: "🥬", category: "vegetable", isCommon: false },
  { name: "Carrot", emoji: "🥕", category: "vegetable", isCommon: true },
  { name: "Cauliflower", emoji: "🥦", category: "vegetable", isCommon: false },
  { name: "Celery", emoji: "🥬", category: "vegetable", isCommon: false },
  { name: "Cucumber", emoji: "🥒", category: "vegetable", isCommon: false },
  { name: "Eggplant", emoji: "🍆", category: "vegetable", isCommon: false },
  { name: "Garlic", emoji: "🧄", category: "vegetable", isCommon: false },
  { name: "Ginger", emoji: "🫚", category: "vegetable", isCommon: false },
  { name: "Lettuce", emoji: "🥬", category: "vegetable", isCommon: false },
  { name: "Mint", emoji: "🌿", category: "vegetable", isCommon: false },
  { name: "Peas", emoji: "🫛", category: "vegetable", isCommon: false },
  { name: "Potato", emoji: "🥔", category: "vegetable", isCommon: false },
  { name: "Pumpkin", emoji: "🎃", category: "vegetable", isCommon: false },
  { name: "Rosemary", emoji: "🌿", category: "vegetable", isCommon: false },
  { name: "Shallot", emoji: "🧅", category: "vegetable", isCommon: false },
  { name: "Spinach", emoji: "🥬", category: "vegetable", isCommon: false },
  { name: "Sweet Potato", emoji: "🍠", category: "vegetable", isCommon: true },
  { name: "Tomato", emoji: "🍅", category: "vegetable", isCommon: false },
  { name: "Zucchini", emoji: "🥒", category: "vegetable", isCommon: false },
  
  // Grains & cereals
  { name: "Barley", emoji: "🌾", category: "grain", isCommon: false },
  { name: "Bread", emoji: "🍞", category: "grain", isCommon: false },
  { name: "Couscous", emoji: "🍚", category: "grain", isCommon: false },
  { name: "Noodles", emoji: "🍜", category: "grain", isCommon: false },
  { name: "Oats", emoji: "🌾", category: "grain", isCommon: true },
  { name: "Pasta", emoji: "🍝", category: "grain", isCommon: false },
  { name: "Quinoa", emoji: "🌾", category: "grain", isCommon: false },
  { name: "Rice", emoji: "🍚", category: "grain", isCommon: true },
  { name: "Weet-bix", emoji: "🌾", category: "grain", isCommon: false },
  { name: "Wheat", emoji: "🌾", category: "grain", isCommon: true },
  
  // Fruit
  { name: "Apple", emoji: "🍎", category: "fruit", isCommon: true },
  { name: "Avocado", emoji: "🥑", category: "fruit", isCommon: true },
  { name: "Banana", emoji: "🍌", category: "fruit", isCommon: true },
  { name: "Blueberry", emoji: "🫐", category: "fruit", isCommon: false },
  { name: "Kiwi fruit", emoji: "🥝", category: "fruit", isCommon: false },
  { name: "Mango", emoji: "🥭", category: "fruit", isCommon: false },
  { name: "Orange", emoji: "🍊", category: "fruit", isCommon: false },
  { name: "Pear", emoji: "🍐", category: "fruit", isCommon: false },
  { name: "Pineapple", emoji: "🍍", category: "fruit", isCommon: false },
  { name: "Prunes", emoji: "🫐", category: "fruit", isCommon: false },
  { name: "Raspberry", emoji: "🫐", category: "fruit", isCommon: false },
  { name: "Rockmelon", emoji: "🍈", category: "fruit", isCommon: false },
  { name: "Strawberry", emoji: "🍓", category: "fruit", isCommon: true },
  { name: "Watermelon", emoji: "🍉", category: "fruit", isCommon: false },
  
  // Dairy
  { name: "Milk", emoji: "🥛", category: "dairy", isCommon: true },
  { name: "Cottage cheese", emoji: "🧀", category: "dairy", isCommon: false },
  { name: "Goats cheese", emoji: "🧀", category: "dairy", isCommon: false },
  { name: "Mozzarella", emoji: "🧀", category: "dairy", isCommon: false },
  { name: "Ricotta cheese", emoji: "🧀", category: "dairy", isCommon: true },
  { name: "Plain yoghurt", emoji: "🥛", category: "dairy", isCommon: true },
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
