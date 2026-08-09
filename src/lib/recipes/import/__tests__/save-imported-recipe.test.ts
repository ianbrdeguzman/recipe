import { describe, expect, it, vi } from "vitest";

const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: insertMock,
  },
}));

import { saveImportedRecipe } from "@/lib/recipes/import/save-imported-recipe";

describe("saveImportedRecipe", () => {
  it("persists an imported recipe with source metadata", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
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
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    insertMock.mockReturnValue({ values });

    const result = await saveImportedRecipe({
      userId: "user-1",
      sourceUrl: "https://example.com/recipe",
      input: {
        title: "Pancakes",
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    });

    expect(result.sourceType).toBe("url");
    expect(result.sourceUrl).toBe("https://example.com/recipe");
  });
});
