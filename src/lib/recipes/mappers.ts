import { recipeSourceTypeEnum } from "@/lib/db/schema";

import type { CreateRecipe } from "./schema";

export function toRecipe(input: CreateRecipe, userId: string) {
  return {
    id: crypto.randomUUID(),
    userId,
    sourceType: recipeSourceTypeEnum.enumValues[0],
    sourceUrl: null,
    title: input.title.trim(),
    description: normalizeOptionalText(input.description),
    servings: input.servings ?? null,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    cookTimeMinutes: input.cookTimeMinutes ?? null,
    ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
    instructions: input.instructions.map((instruction) => instruction.trim()),
  };
}

function normalizeOptionalText(value?: string | null) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
