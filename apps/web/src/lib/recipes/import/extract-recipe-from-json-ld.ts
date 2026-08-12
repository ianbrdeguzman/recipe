import type { RecipeInput } from "@/lib/recipes/schema";

import { PageSignals } from "./extract-page-signals";

export function extractRecipeFromJsonLd({
  signals: { metadata, recipe },
}: {
  signals: PageSignals;
}): RecipeInput | null {
  const title = metadata.title ?? recipe.title;
  const description = metadata.description ?? recipe.description ?? null;
  const imageUrl = metadata.image ?? null;

  if (
    !title ||
    !recipe.servings ||
    !recipe.prepTimeMinutes ||
    !recipe.cookTimeMinutes ||
    recipe.ingredients.length === 0 ||
    recipe.instructions.length === 0
  ) {
    return null;
  }

  return {
    title,
    description,
    imageUrl,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}
