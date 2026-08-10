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

import { extractRecipe } from "@/lib/recipes/import/extract-recipe";
import { extractRecipeFromJsonLd } from "@/lib/recipes/import/extract-recipe-from-json-ld";
import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";
import { fetchWebpage } from "@/lib/recipes/import/fetch-webpage";
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
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue({
      title: "Pancakes",
      description: null,
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
    expect(extractRecipeFromJsonLd).toHaveBeenCalledWith({ html: "<html></html>" });
    expect(extractRecipe).not.toHaveBeenCalled();
    expect(fetchWithJina).not.toHaveBeenCalled();
    expect(result.servings).toBe(12);
  });

  it("falls back to raw HTML markdown extraction when JSON-LD is incomplete", async () => {
    vi.mocked(fetchWebpage).mockResolvedValue({
      html: "<html><body><h1>Pancakes</h1></body></html>",
      sourceUrl: "https://example.com/recipe",
    });
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue(null);
    vi.mocked(htmlToMarkdown).mockReturnValue("# Pancakes\n\nIngredients\n- flour");
    vi.mocked(extractRecipe).mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    const result = await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(htmlToMarkdown).toHaveBeenCalledWith("<html><body><h1>Pancakes</h1></body></html>");
    expect(extractRecipe).toHaveBeenCalledWith({
      sourceUrl: "https://example.com/recipe",
      content: "# Pancakes\n\nIngredients\n- flour",
    });
    expect(fetchWithJina).not.toHaveBeenCalled();
    expect(result.prepTimeMinutes).toBe(10);
  });

  it("falls back to Jina when raw HTML extraction fails", async () => {
    vi.mocked(fetchWebpage).mockResolvedValue({
      html: "<html><body><h1>Pancakes</h1></body></html>",
      sourceUrl: "https://example.com/recipe",
    });
    vi.mocked(extractRecipeFromJsonLd).mockReturnValue(null);
    vi.mocked(htmlToMarkdown).mockReturnValue("# Pancakes\n\nIngredients\n- flour");
    vi.mocked(extractRecipe)
      .mockRejectedValueOnce(new Error("html extraction failed"))
      .mockResolvedValueOnce({
        title: "Pancakes",
        description: null,
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
