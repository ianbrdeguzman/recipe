import { describe, expect, it, vi } from "vitest";

const { selectMock, insertMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

import { createUserRecipeFromImportedRecipe } from "@/lib/recipes/import/save-imported-recipe";

describe("save-imported-recipe re-exports", () => {
  it("re-exports createUserRecipeFromImportedRecipe during the transition", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
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
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    insertMock.mockReturnValue({ values });

    const result = await createUserRecipeFromImportedRecipe({
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
      canonicalRecipe: {
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
      },
    });

    expect(result.importedRecipeId).toBe("imported-1");
    expect(result.sourceUrl).toBe("https://example.com/recipe");
  });
});
