import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/extract-recipe", () => ({
  extractRecipe: vi.fn(),
}));

vi.mock("@/lib/recipes/import/extract-recipe-from-json-ld", () => ({
  extractRecipeFromJsonLd: vi.fn(),
}));

vi.mock("@/lib/recipes/import/fetch-webpage", () => ({
  fetchWebpage: vi.fn(),
}));

vi.mock("@/lib/recipes/import/fetch-with-jina", () => ({
  fetchWithJina: vi.fn(),
}));

vi.mock("@/lib/recipes/import/html-to-markdown", () => ({
  htmlToMarkdown: vi.fn(),
}));

vi.mock("@/lib/recipes/import/extract-page-signals", () => ({
  extractPageSignals: vi.fn(),
}));

vi.mock("@/lib/recipes/import/format-webpage-fallback-content", () => ({
  formatWebpageFallbackContent: vi.fn(),
}));

import { extractPageSignals } from "@/lib/recipes/import/extract-page-signals";
import { extractRecipe } from "@/lib/recipes/import/extract-recipe";
import { extractRecipeFromJsonLd } from "@/lib/recipes/import/extract-recipe-from-json-ld";
import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";
import { fetchWebpage } from "@/lib/recipes/import/fetch-webpage";
import { formatWebpageFallbackContent } from "@/lib/recipes/import/format-webpage-fallback-content";
import { htmlToMarkdown } from "@/lib/recipes/import/html-to-markdown";
import { webpageImporter } from "@/lib/recipes/import/importers/webpage-importer";

describe("webpageImporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the JSON-LD recipe when all required fields are present", async () => {
    vi.mocked(fetchWebpage).mockResolvedValue({
      html: "<html></html>",
      sourceUrl: "https://example.com/recipe",
    });
    vi.mocked(extractPageSignals).mockReturnValue({
      metadata: {
        title: "Pancakes",
        description: null,
        image: "https://cdn.example.com/pancakes.jpg",
      },
      recipe: {
        title: "Pancakes",
        description: null,
        servings: 12,
        prepTimeMinutes: 5,
        cookTimeMinutes: 20,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    });
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue({
      title: "Pancakes",
      description: null,
      imageUrl: "https://cdn.example.com/pancakes.jpg",
      servings: 12,
      prepTimeMinutes: 5,
      cookTimeMinutes: 20,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    const result = await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(fetchWebpage).toHaveBeenCalledOnce();
    expect(extractPageSignals).toHaveBeenCalledWith({ html: "<html></html>" });
    expect(extractRecipeFromJsonLd).toHaveBeenCalledWith({
      signals: {
        metadata: {
          title: "Pancakes",
          description: null,
          image: "https://cdn.example.com/pancakes.jpg",
        },
        recipe: {
          title: "Pancakes",
          description: null,
          servings: 12,
          prepTimeMinutes: 5,
          cookTimeMinutes: 20,
          ingredients: ["1 cup flour"],
          instructions: ["Mix ingredients"],
        },
      },
    });
    expect(extractRecipe).not.toHaveBeenCalled();
    expect(fetchWithJina).not.toHaveBeenCalled();
    expect(result.servings).toBe(12);
  });

  it("prepends metadata and partial JSON-LD context before LLM fallback extraction", async () => {
    vi.mocked(fetchWebpage).mockResolvedValue({
      html: `
        <html>
          <head>
            <meta property="og:title" content="Metadata Pancakes" />
            <meta property="og:description" content="Fluffy pancakes from metadata" />
            <meta property="og:image" content="https://cdn.example.com/pancakes.jpg" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "recipeYield": "4 servings",
                "recipeIngredient": ["1 cup flour"],
                "recipeInstructions": ["Mix ingredients"]
              }
            </script>
          </head>
          <body><h1>Pancakes</h1></body>
        </html>
      `,
      sourceUrl: "https://example.com/recipe",
    });
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue(null);
    vi.mocked(htmlToMarkdown).mockReturnValue("# Pancakes");
    vi.mocked(extractPageSignals).mockReturnValue({
      metadata: {
        title: "Metadata Pancakes",
        description: "Fluffy pancakes from metadata",
        image: "https://cdn.example.com/pancakes.jpg",
      },
      recipe: {
        title: null,
        description: null,
        servings: 4,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    });
    vi.mocked(formatWebpageFallbackContent).mockReturnValue(
      `Page metadata:\nTitle: Metadata Pancakes\nDescription: Fluffy pancakes from metadata\nImage: https://cdn.example.com/pancakes.jpg\n\nStructured recipe data found:\nServings: 4\nIngredients:\n- 1 cup flour\nInstructions:\n- Mix ingredients\n\nPage content:\n# Pancakes`,
    );
    vi.mocked(extractRecipe).mockResolvedValue({
      title: "Pancakes",
      description: null,
      imageUrl: "https://cdn.example.com/pancakes.jpg",
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(htmlToMarkdown).toHaveBeenCalled();
    expect(extractPageSignals).toHaveBeenCalled();
    expect(formatWebpageFallbackContent).toHaveBeenCalledWith({
      metadata: {
        title: "Metadata Pancakes",
        description: "Fluffy pancakes from metadata",
        image: "https://cdn.example.com/pancakes.jpg",
      },
      recipe: {
        title: null,
        description: null,
        servings: 4,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
      markdown: "# Pancakes",
    });
    expect(extractRecipe).toHaveBeenCalledWith({
      sourceUrl: "https://example.com/recipe",
      content: `Page metadata:\nTitle: Metadata Pancakes\nDescription: Fluffy pancakes from metadata\nImage: https://cdn.example.com/pancakes.jpg\n\nStructured recipe data found:\nServings: 4\nIngredients:\n- 1 cup flour\nInstructions:\n- Mix ingredients\n\nPage content:\n# Pancakes`,
    });
    expect(fetchWithJina).not.toHaveBeenCalled();
  });

  it("falls back to Jina when raw HTML extraction fails", async () => {
    vi.mocked(fetchWebpage).mockResolvedValue({
      html: "<html><body><h1>Pancakes</h1></body></html>",
      sourceUrl: "https://example.com/recipe",
    });
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue(null);
    vi.mocked(htmlToMarkdown).mockReturnValue("# Pancakes\n\nIngredients\n- flour");
    vi.mocked(extractPageSignals).mockReturnValue({
      metadata: {
        title: null,
        description: null,
        image: null,
      },
      recipe: {
        title: null,
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: [],
        instructions: [],
      },
    });
    vi.mocked(formatWebpageFallbackContent).mockReturnValue("# Pancakes\n\nIngredients\n- flour");
    vi.mocked(extractRecipe)
      .mockRejectedValueOnce(new Error("html extraction failed"))
      .mockResolvedValueOnce({
        title: "Pancakes",
        description: null,
        imageUrl: null,
        servings: 4,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      });
    vi.mocked(fetchWithJina).mockResolvedValue({
      readerUrl: "https://r.jina.ai/https://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });

    const result = await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(fetchWithJina).toHaveBeenCalledOnce();
    expect(extractRecipe).toHaveBeenNthCalledWith(2, {
      sourceUrl: "https://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });
    expect(result.instructions).toEqual(["Mix ingredients"]);
  });
});
