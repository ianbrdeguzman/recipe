import { z } from "zod";

const nonEmptyListItem = z
  .string()
  .trim()
  .min(1, "This field cannot be blank.");

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  prepTimeMinutes: z.number().int().positive().nullable().optional(),
  cookTimeMinutes: z.number().int().positive().nullable().optional(),
  ingredients: z.array(nonEmptyListItem).min(1, "Add at least 1 ingredient."),
  instructions: z.array(nonEmptyListItem).min(1, "Add at least 1 instruction."),
});
export const createRecipeSchema = recipeInputSchema;
export const updateRecipeSchema = recipeInputSchema;

export type RecipeInput = z.infer<typeof recipeInputSchema>;
