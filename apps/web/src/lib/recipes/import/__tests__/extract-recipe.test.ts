import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const parseMock = vi.fn();

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: createMock,
      parse: parseMock,
    };
  }

  return { default: OpenAI };
});

import { RecipeExtractionError, RecipeValidationError } from "@/lib/recipes/import/errors";
import { extractRecipe } from "@/lib/recipes/import/extract-recipe";

describe("extractRecipe", () => {
  beforeEach(() => {
    createMock.mockReset();
    parseMock.mockReset();
  });

  it("uses structured outputs via responses.parse", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        title: "Pancakes",
        description: "Fluffy",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
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

    expect(createMock).not.toHaveBeenCalled();
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-mini",
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            schema: expect.objectContaining({
              type: "object",
              required: [
                "title",
                "description",
                "servings",
                "prepTimeMinutes",
                "cookTimeMinutes",
                "ingredients",
                "instructions",
              ],
            }),
          }),
        },
      }),
    );
  });

  it("throws RecipeExtractionError when the model returns no structured output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: null,
    });

    await expect(
      extractRecipe({
        sourceUrl: "https://example.com/recipe",
        content: "Ingredients...Instructions...",
        apiKey: "test-key",
        model: "gpt-5-mini",
      }),
    ).rejects.toBeInstanceOf(RecipeExtractionError);
  });

  it("throws RecipeValidationError when the model omits instructions", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        title: "Pancakes",
        ingredients: ["1 cup flour"],
        instructions: [],
      },
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
