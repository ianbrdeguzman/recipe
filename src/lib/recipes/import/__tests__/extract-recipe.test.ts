import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: createMock,
    };
  }

  return { default: OpenAI };
});

import { RecipeValidationError } from "@/lib/recipes/import/errors";
import { extractRecipe } from "@/lib/recipes/import/extract-recipe";

describe("extractRecipe", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("returns validated recipe input from structured model output", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify({
        title: "Pancakes",
        description: "Fluffy",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      }),
    });

    await expect(
      extractRecipe({
        sourceUrl: "https://example.com/recipe",
        content: "Ingredients...Instructions...",
        apiKey: "test-key",
        model: "gpt-5-mini",
      }),
    ).resolves.toMatchObject({
      title: "Pancakes",
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });
  });

  it("throws RecipeValidationError when the model omits instructions", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify({
        title: "Pancakes",
        ingredients: ["1 cup flour"],
        instructions: [],
      }),
    });

    await expect(
      extractRecipe({
        sourceUrl: "https://example.com/recipe",
        content: "Ingredients...Instructions...",
        apiKey: "test-key",
        model: "gpt-5-mini",
      }),
    ).rejects.toBeInstanceOf(RecipeValidationError);
  });
});
