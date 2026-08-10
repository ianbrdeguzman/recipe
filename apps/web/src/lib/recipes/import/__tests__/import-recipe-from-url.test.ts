import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/imported-recipe-store", () => ({
  findUserRecipeByNormalizedUrl: vi.fn(),
  findImportedRecipeByNormalizedUrl: vi.fn(),
  createImportedRecipe: vi.fn(),
  createUserRecipeFromImportedRecipe: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importer-registry", () => ({
  getRecipeImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importers/webpage-importer", () => ({
  webpageImporter: vi.fn(),
}));

import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "@/lib/recipes/import/imported-recipe-store";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";

describe("importRecipeFromUrl", () => {
  it("returns an existing user recipe when the normalized URL is already saved", async () => {
    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
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
      importedRecipeId: "imported-1",
    } as never);

    const result = await importRecipeFromUrl({
      url: "https://EXAMPLE.com/recipe/",
      userId: "user-1",
    });

    expect(result.id).toBe("recipe-1");
    expect(findImportedRecipeByNormalizedUrl).not.toHaveBeenCalled();
    expect(getRecipeImporter).not.toHaveBeenCalled();
  });

  it("clones from canonical cache when another user already imported the normalized URL", async () => {
    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(findImportedRecipeByNormalizedUrl).mockResolvedValue({
      id: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://EXAMPLE.com/recipe/",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(createUserRecipeFromImportedRecipe).mockResolvedValue({
      id: "recipe-2",
      userId: "user-2",
      importedRecipeId: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe/",
      userId: "user-2",
    });

    expect(result.id).toBe("recipe-2");
    expect(getRecipeImporter).not.toHaveBeenCalled();
  });

  it("imports upstream on canonical cache miss, then stores canonical and user rows", async () => {
    const importer = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(findImportedRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(getRecipeImporter).mockReturnValue(importer);
    vi.mocked(createImportedRecipe).mockResolvedValue({
      id: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://example.com/recipe/",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(createUserRecipeFromImportedRecipe).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      importedRecipeId: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe/",
      userId: "user-1",
    });

    expect(importer).toHaveBeenCalledOnce();
    expect(createImportedRecipe).toHaveBeenCalledWith({
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://example.com/recipe/",
      input: expect.objectContaining({ title: "Pancakes" }),
    });
    expect(result.id).toBe("recipe-1");
  });
});
