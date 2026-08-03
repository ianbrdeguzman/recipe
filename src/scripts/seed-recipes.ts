import { and, eq, inArray } from "drizzle-orm";

import { db, client } from "@/lib/db";
import { recipe } from "@/lib/db/schema";

const USER_ID = "nmvtmxLrMHiXCMlpFH5jn9DDVYGpAonU";

const seedRecipes = [
  {
    title: "Classic Pancakes",
    sourceType: "manual" as const,
    sourceUrl: null,
    description: "Fluffy weekend pancakes.",
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    ingredients: [
      "1 1/2 cups all-purpose flour",
      "3 1/2 tsp baking powder",
      "1 tbsp sugar",
      "1/4 tsp salt",
      "1 1/4 cups milk",
      "1 egg",
      "3 tbsp melted butter",
    ],
    instructions: [
      "Whisk dry ingredients together in a bowl.",
      "Whisk milk, egg, and melted butter in a separate bowl.",
      "Combine wet and dry ingredients until just mixed.",
      "Cook 1/4 cup portions on a hot greased skillet until golden on both sides.",
    ],
  },
  {
    title: "Garlic Butter Pasta",
    sourceType: "manual" as const,
    sourceUrl: null,
    description: "Quick pasta for busy nights.",
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    ingredients: [
      "8 oz spaghetti",
      "3 tbsp butter",
      "3 cloves garlic, minced",
      "1/4 cup grated parmesan",
      "2 tbsp chopped parsley",
      "Salt",
      "Black pepper",
    ],
    instructions: [
      "Cook pasta in salted water until al dente.",
      "Melt butter in a skillet and cook garlic until fragrant.",
      "Add drained pasta and toss to coat.",
      "Stir in parmesan and parsley, then season with salt and pepper.",
    ],
  },
  {
    title: "Roasted Tomato Soup",
    sourceType: "url" as const,
    sourceUrl: "https://example.com/recipes/roasted-tomato-soup",
    description: "Simple tomato soup with roasted flavor.",
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 35,
    ingredients: [
      "2 lb tomatoes",
      "1 onion, sliced",
      "4 cloves garlic",
      "2 tbsp olive oil",
      "2 cups vegetable broth",
      "1/4 cup cream",
      "Salt",
      "Black pepper",
    ],
    instructions: [
      "Roast tomatoes, onion, and garlic with olive oil at 425°F until softened.",
      "Transfer roasted vegetables to a pot with broth.",
      "Blend until smooth.",
      "Stir in cream and season to taste before serving.",
    ],
  },
];

async function main() {
  const now = new Date();
  const titles = seedRecipes.map((r) => r.title);

  const existing = await db
    .select({ title: recipe.title })
    .from(recipe)
    .where(and(eq(recipe.userId, USER_ID), inArray(recipe.title, titles)));

  const existingTitles = new Set(existing.map((r) => r.title));

  const rowsToInsert = seedRecipes
    .filter((r) => !existingTitles.has(r.title))
    .map((r) => ({
      id: crypto.randomUUID(),
      userId: USER_ID,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      title: r.title,
      description: r.description,
      servings: r.servings,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      ingredients: r.ingredients,
      instructions: r.instructions,
      createdAt: now,
      updatedAt: now,
    }));

  if (rowsToInsert.length === 0) {
    console.log(
      "No recipes inserted; seed data already exists for user:",
      USER_ID,
    );
    return;
  }

  await db.insert(recipe).values(rowsToInsert);

  console.log(`Inserted ${rowsToInsert.length} recipe(s) for user: ${USER_ID}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed recipes");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
