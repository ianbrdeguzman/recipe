import { z } from "zod";

const nonEmptyListItem = z
  .string()
  .trim()
  .min(1, "This field cannot be blank.");

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  prepTimeMinutes: z.number().int().positive().nullable().optional(),
  cookTimeMinutes: z.number().int().positive().nullable().optional(),
  ingredients: z.array(nonEmptyListItem).min(1, "Add at least 1 ingredient."),
  instructions: z.array(nonEmptyListItem).min(1, "Add at least 1 instruction."),
});
export const createRecipeSchema = recipeInputSchema;
export const updateRecipeSchema = recipeInputSchema;

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const importRecipeSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required.")
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid URL.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Only http and https URLs are supported."),
});
