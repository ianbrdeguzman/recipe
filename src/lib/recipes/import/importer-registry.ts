import { UnsupportedImportSourceError } from "./errors";
import type { ImportSourceType, RecipeImporter } from "./types";

export function getRecipeImporter({
  sourceType,
  webpageImporter,
}: {
  sourceType: ImportSourceType;
  webpageImporter: RecipeImporter;
}): RecipeImporter {
  if (sourceType === "webpage") {
    return webpageImporter;
  }

  throw new UnsupportedImportSourceError(sourceType);
}
