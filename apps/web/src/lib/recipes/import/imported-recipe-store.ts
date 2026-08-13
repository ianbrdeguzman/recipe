import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { importedRecipe, recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

import { RecipePersistenceError } from "./errors";
import type { CanonicalImportedRecipe, ImportedRecipe } from "./types";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function findUserRecipeByNormalizedUrl({
  userId,
  normalizedSourceUrl,
}: {
  userId: string;
  normalizedSourceUrl: string;
}): Promise<ImportedRecipe | null> {
  const [existingRecipe] = await db
    .select()
    .from(recipe)
    .where(
      and(
        eq(recipe.userId, userId),
        eq(recipe.normalizedSourceUrl, normalizedSourceUrl),
      ),
    );

  return existingRecipe ?? null;
}

export async function findImportedRecipeByNormalizedUrl({
  normalizedSourceUrl,
}: {
  normalizedSourceUrl: string;
}): Promise<CanonicalImportedRecipe | null> {
  const [existingImportedRecipe] = await db
    .select()
    .from(importedRecipe)
    .where(eq(importedRecipe.normalizedSourceUrl, normalizedSourceUrl));

  return existingImportedRecipe ?? null;
}

export async function createImportedRecipe({
  importedRecipeId,
  normalizedSourceUrl,
  originalSourceUrl,
  input,
  imageKey,
}: {
  importedRecipeId: string;
  normalizedSourceUrl: string;
  originalSourceUrl: string;
  input: RecipeInput;
  imageKey: string | null;
}): Promise<CanonicalImportedRecipe> {
  try {
    const [createdImportedRecipe] = await db
      .insert(importedRecipe)
      .values({
        id: importedRecipeId,
        normalizedSourceUrl,
        originalSourceUrl,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        imageKey,
        servings: input.servings ?? null,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        cookTimeMinutes: input.cookTimeMinutes ?? null,
        ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
        instructions: input.instructions.map((instruction) =>
          instruction.trim(),
        ),
      })
      .returning();

    return createdImportedRecipe;
  } catch (error) {
    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "Imported recipe insert failed",
    );
  }
}

export async function createUserRecipeFromImportedRecipe({
  userId,
  normalizedSourceUrl,
  canonicalRecipe,
}: {
  userId: string;
  normalizedSourceUrl: string;
  canonicalRecipe: CanonicalImportedRecipe;
}): Promise<ImportedRecipe> {
  try {
    const [createdRecipe] = await db
      .insert(recipe)
      .values({
        id: crypto.randomUUID(),
        userId,
        importedRecipeId: canonicalRecipe.id,
        normalizedSourceUrl,
        sourceType: "url",
        sourceUrl: normalizedSourceUrl,
        title: canonicalRecipe.title,
        description: canonicalRecipe.description,
        imageUrl: canonicalRecipe.imageUrl,
        imageKey: canonicalRecipe.imageKey,
        servings: canonicalRecipe.servings,
        prepTimeMinutes: canonicalRecipe.prepTimeMinutes,
        cookTimeMinutes: canonicalRecipe.cookTimeMinutes,
        ingredients: canonicalRecipe.ingredients,
        instructions: canonicalRecipe.instructions,
      })
      .returning();

    return createdRecipe;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingRecipe = await findUserRecipeByNormalizedUrl({
        userId,
        normalizedSourceUrl,
      });

      if (existingRecipe) {
        return existingRecipe;
      }
    }

    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "User recipe insert failed",
    );
  }
}
