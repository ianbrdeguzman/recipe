import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/importer-registry", () => ({
  getRecipeImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importers/webpage-importer", () => ({
  webpageImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/save-imported-recipe", () => ({
  saveImportedRecipe: vi.fn(),
}));

import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { saveImportedRecipe } from "@/lib/recipes/import/save-imported-recipe";

describe("importRecipeFromUrl", () => {
  it("detects the source, imports it, and saves the recipe", async () => {
    const importer = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    vi.mocked(getRecipeImporter).mockReturnValue(importer);
    vi.mocked(saveImportedRecipe).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe",
      userId: "user-1",
    });

    expect(importer).toHaveBeenCalledWith({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });
    expect(result.id).toBe("recipe-1");
  });
});
