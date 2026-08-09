import { getRecipeImporter } from "./importer-registry";
import { webpageImporter } from "./importers/webpage-importer";
import { saveImportedRecipe } from "./save-imported-recipe";
import { detectImportSourceType } from "./source-type";

export async function importRecipeFromUrl({
  url,
  userId,
}: {
  url: string;
  userId: string;
}) {
  const parsedUrl = new URL(url);
  const sourceType = detectImportSourceType(parsedUrl);
  const importer = getRecipeImporter({ sourceType, webpageImporter });
  const input = await importer({ url: parsedUrl, sourceType });

  return saveImportedRecipe({
    input,
    userId,
    sourceUrl: parsedUrl.toString(),
  });
}
