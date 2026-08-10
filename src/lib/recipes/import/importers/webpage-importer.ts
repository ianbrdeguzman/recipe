import { extractRecipe } from "../extract-recipe";
import { extractRecipeFromJsonLd } from "../extract-recipe-from-json-ld";
import { fetchWithJina } from "../fetch-with-jina";
import { fetchWebpage } from "../fetch-webpage";
import { htmlToMarkdown } from "../html-to-markdown";
import type { RecipeImporter } from "../types";

export const webpageImporter: RecipeImporter = async ({ url }) => {
  try {
    const { html, sourceUrl } = await fetchWebpage({ url });
    const jsonLdRecipe = extractRecipeFromJsonLd({ html });

    if (jsonLdRecipe) {
      return jsonLdRecipe;
    }

    const content = htmlToMarkdown(html);

    if (content.trim().length > 0) {
      return await extractRecipe({
        sourceUrl,
        content,
      });
    }
  } catch {
    // Fall through to Jina as a last resort.
  }

  const { content } = await fetchWithJina({ url });

  return extractRecipe({
    sourceUrl: url.toString(),
    content,
  });
};
