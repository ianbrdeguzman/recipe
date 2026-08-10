import { recipeSourceTypeEnum } from "@/lib/db/schema";

import type { RecipeInput } from "./schema";

export function toRecipe(input: RecipeInput, userId: string) {
  return {
    id: crypto.randomUUID(),
    userId,
    sourceType: recipeSourceTypeEnum.enumValues[0],
    sourceUrl: null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    servings: input.servings ?? null,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    cookTimeMinutes: input.cookTimeMinutes ?? null,
    ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
    instructions: input.instructions.map((instruction) => instruction.trim()),
  };
}
