import { getRecipeImporter } from "./importer-registry";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "./imported-recipe-store";
import { webpageImporter } from "./importers/webpage-importer";
import { normalizeRecipeSourceUrl } from "./normalize-source-url";
import { detectImportSourceType } from "./source-type";

export async function importRecipeFromUrl({
  url,
  userId,
}: {
  url: string;
  userId: string;
}) {
  const parsedUrl = new URL(url);
  const normalizedSourceUrl = normalizeRecipeSourceUrl(parsedUrl);

  const existingUserRecipe = await findUserRecipeByNormalizedUrl({
    userId,
    normalizedSourceUrl,
  });

  if (existingUserRecipe) {
    return existingUserRecipe;
  }

  const existingImportedRecipe = await findImportedRecipeByNormalizedUrl({
    normalizedSourceUrl,
  });

  if (existingImportedRecipe) {
    return createUserRecipeFromImportedRecipe({
      userId,
      normalizedSourceUrl,
      canonicalRecipe: existingImportedRecipe,
    });
  }

  const sourceType = detectImportSourceType(parsedUrl);
  const importer = getRecipeImporter({ sourceType, webpageImporter });
  const input = await importer({ url: parsedUrl, sourceType });
  const canonicalRecipe = await createImportedRecipe({
    normalizedSourceUrl,
    originalSourceUrl: parsedUrl.toString(),
    input,
  });

  return createUserRecipeFromImportedRecipe({
    userId,
    normalizedSourceUrl,
    canonicalRecipe,
  });
}
