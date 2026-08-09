import type { recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";

export type ImportedRecipe = typeof recipe.$inferSelect;

export type RecipeImporter = (args: {
  url: URL;
  sourceType: ImportSourceType;
}) => Promise<RecipeInput>;
