import type { importedRecipe, recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";

export type ImportedRecipe = typeof recipe.$inferSelect;
export type CanonicalImportedRecipe = typeof importedRecipe.$inferSelect;

export type RecipeImporter = (args: {
  url: URL;
  sourceType: ImportSourceType;
}) => Promise<RecipeInput>;
