import { getRecipeImporter } from "./importer-registry";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "./imported-recipe-store";
import { webpageImporter } from "./importers/webpage-importer";
import { normalizeRecipeSourceUrl } from "./normalize-source-url";
import { storeImportedRecipeImage } from "./recipe-image-storage";
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
  const importedRecipeId = crypto.randomUUID();
  const imageKey = input.imageUrl
    ? await storeImportedRecipeImage({
        importedRecipeId,
        imageUrl: input.imageUrl,
      })
    : null;
  const canonicalRecipe = await createImportedRecipe({
    importedRecipeId,
    normalizedSourceUrl,
    originalSourceUrl: parsedUrl.toString(),
    input,
    imageKey,
  });

  return createUserRecipeFromImportedRecipe({
    userId,
    normalizedSourceUrl,
    canonicalRecipe,
  });
}
