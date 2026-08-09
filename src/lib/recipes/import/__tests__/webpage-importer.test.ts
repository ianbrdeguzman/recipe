import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/fetch-with-jina", () => ({
  fetchWithJina: vi.fn(),
}));

vi.mock("@/lib/recipes/import/extract-recipe", () => ({
  extractRecipe: vi.fn(),
}));

import { extractRecipe } from "@/lib/recipes/import/extract-recipe";
import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";
import { webpageImporter } from "@/lib/recipes/import/importers/webpage-importer";

describe("webpageImporter", () => {
  it("fetches readable content and passes it to the extractor", async () => {
    vi.mocked(fetchWithJina).mockResolvedValue({
      readerUrl: "https://r.jina.ai/https://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });
    vi.mocked(extractRecipe).mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    const result = await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(fetchWithJina).toHaveBeenCalledOnce();
    expect(extractRecipe).toHaveBeenCalledWith({
      sourceUrl: "https://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });
    expect(result.title).toBe("Pancakes");
  });
});
