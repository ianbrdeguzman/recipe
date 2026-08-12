import { extractPageSignals } from "../extract-page-signals";
import { extractRecipe } from "../extract-recipe";
import { extractRecipeFromJsonLd } from "../extract-recipe-from-json-ld";
import { fetchWithJina } from "../fetch-with-jina";
import { fetchWebpage } from "../fetch-webpage";
import { formatWebpageFallbackContent } from "../format-webpage-fallback-content";
import { htmlToMarkdown } from "../html-to-markdown";
import type { RecipeImporter } from "../types";

export const webpageImporter: RecipeImporter = async ({ url }) => {
  try {
    const { html, sourceUrl } = await fetchWebpage({ url });

    const signals = extractPageSignals({ html });

    const jsonLdRecipe = extractRecipeFromJsonLd({ signals });

    if (jsonLdRecipe) {
      return jsonLdRecipe;
    }

    const markdown = htmlToMarkdown(html);
    const content = formatWebpageFallbackContent({
      metadata: signals.metadata,
      recipe: signals.recipe,
      markdown,
    });

    return await extractRecipe({
      sourceUrl,
      content,
    });
  } catch {
    // Fall through to Jina as a last resort.
  }

  const { content } = await fetchWithJina({ url });

  return extractRecipe({
    sourceUrl: url.toString(),
    content,
  });
};
