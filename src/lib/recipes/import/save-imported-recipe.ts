import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

import { RecipePersistenceError } from "./errors";
import type { ImportedRecipe } from "./types";

export async function saveImportedRecipe({
  input,
  userId,
  sourceUrl,
}: {
  input: RecipeInput;
  userId: string;
  sourceUrl: string;
}): Promise<ImportedRecipe> {
  try {
    const [createdRecipe] = await db
      .insert(recipe)
      .values({
        id: crypto.randomUUID(),
        userId,
        sourceType: "url",
        sourceUrl,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        servings: input.servings ?? null,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        cookTimeMinutes: input.cookTimeMinutes ?? null,
        ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
        instructions: input.instructions.map((instruction) => instruction.trim()),
      })
      .returning();

    return createdRecipe;
  } catch (error) {
    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "Recipe insert failed",
    );
  }
}
