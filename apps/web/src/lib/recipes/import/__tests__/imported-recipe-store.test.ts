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

import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "@/lib/recipes/import/imported-recipe-store";

describe("findUserRecipeByNormalizedUrl", () => {
  it("returns the first matching user recipe", async () => {
    const where = vi.fn().mockResolvedValue([{ id: "recipe-1", title: "Pancakes" }]);
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    const result = await findUserRecipeByNormalizedUrl({
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
    });

    expect(result).toMatchObject({ id: "recipe-1" });
  });
});

describe("findImportedRecipeByNormalizedUrl", () => {
  it("returns the canonical cached recipe for the normalized URL", async () => {
    const where = vi.fn().mockResolvedValue([{ id: "imported-1", title: "Pancakes" }]);
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    const result = await findImportedRecipeByNormalizedUrl({
      normalizedSourceUrl: "https://example.com/recipe",
    });

    expect(result).toMatchObject({ id: "imported-1" });
  });
});

describe("createImportedRecipe", () => {
  it("stores a canonical cached row with the provided imageKey", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: "imported-1",
        normalizedSourceUrl: "https://example.com/recipe",
        imageKey: null,
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    insertMock.mockReturnValue({ values });

    const result = await createImportedRecipe({
      importedRecipeId: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://EXAMPLE.com/recipe/",
      input: {
        title: "Pancakes",
        description: null,
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
      imageKey: "imported/imported-1.webp",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "imported-1",
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        imageKey: "imported/imported-1.webp",
      }),
    );
    expect(result.normalizedSourceUrl).toBe("https://example.com/recipe");
  });
});

describe("createUserRecipeFromImportedRecipe", () => {
  it("clones the canonical recipe into a user-owned recipe row", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: "recipe-1",
        userId: "user-1",
        importedRecipeId: "imported-1",
        normalizedSourceUrl: "https://example.com/recipe",
        sourceType: "url",
        sourceUrl: "https://example.com/recipe",
        title: "Pancakes",
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        imageKey: "imported/imported-1.webp",
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
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
        originalSourceUrl: "https://EXAMPLE.com/recipe/",
        title: "Pancakes",
        description: null,
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        imageKey: "imported/imported-1.webp",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        imageKey: "imported/imported-1.webp",
      }),
    );
    expect(result.importedRecipeId).toBe("imported-1");
    expect(result.sourceUrl).toBe("https://example.com/recipe");
  });

  it("re-queries and returns the existing user recipe when insert loses the uniqueness race", async () => {
    const existingRecipe = {
      id: "recipe-1",
      userId: "user-1",
      importedRecipeId: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      imageUrl: "https://cdn.example.com/pancakes.jpg",
      imageKey: "imported/imported-1.webp",
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    };

    const duplicateError = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      {
        code: "23505",
      },
    );

    const returning = vi.fn().mockRejectedValue(duplicateError);
    const values = vi.fn().mockReturnValue({ returning });
    const where = vi.fn().mockResolvedValue([existingRecipe]);
    const from = vi.fn().mockReturnValue({ where });

    insertMock.mockReturnValue({ values });
    selectMock.mockReturnValue({ from });

    const result = await createUserRecipeFromImportedRecipe({
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
      canonicalRecipe: {
        id: "imported-1",
        normalizedSourceUrl: "https://example.com/recipe",
        originalSourceUrl: "https://example.com/recipe/",
        title: "Pancakes",
        description: null,
        imageUrl: "https://cdn.example.com/pancakes.jpg",
        imageKey: "imported/imported-1.webp",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(result).toMatchObject({ id: "recipe-1" });
  });
});
