import { extractRecipe } from "../extract-recipe";
import { fetchWithJina } from "../fetch-with-jina";
import type { RecipeImporter } from "../types";

export const webpageImporter: RecipeImporter = async ({ url }) => {
  const { content } = await fetchWithJina({ url });

  return extractRecipe({
    sourceUrl: url.toString(),
    content,
  });
};
