import { UnsupportedImportSourceError } from "./errors";
import type { ImportSourceType, RecipeImporter } from "./types";

export function getRecipeImporter(args: {
  sourceType: ImportSourceType;
  webpageImporter: RecipeImporter;
}): RecipeImporter {
  if (args.sourceType === "webpage") {
    return args.webpageImporter;
  }

  throw new UnsupportedImportSourceError(args.sourceType);
}
