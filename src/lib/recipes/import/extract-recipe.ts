import OpenAI from "openai";

import { recipeExtractionSchema } from "./extraction-schema";
import { RecipeExtractionError, RecipeValidationError } from "./errors";

const DEFAULT_MODEL = "gpt-5-mini";
const recipeExtractionResponseFormat = {
  type: "json_schema" as const,
  name: "recipe_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "description",
      "servings",
      "prepTimeMinutes",
      "cookTimeMinutes",
      "ingredients",
      "instructions",
    ],
    properties: {
      title: { type: "string" },
      description: { type: ["string", "null"] },
      servings: { type: ["integer", "null"] },
      prepTimeMinutes: { type: ["integer", "null"] },
      cookTimeMinutes: { type: ["integer", "null"] },
      ingredients: {
        type: "array",
        items: { type: "string" },
      },
      instructions: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export async function extractRecipe({
  sourceUrl,
  content,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_RECIPE_IMPORT_MODEL ?? DEFAULT_MODEL,
}: {
  sourceUrl: string;
  content: string;
  apiKey?: string;
  model?: string;
}) {
  if (!apiKey) {
    throw new RecipeExtractionError("OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Extract a recipe from webpage text. Do not invent values. Use null for missing optional fields. Ingredients and instructions must be arrays.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Source URL: ${sourceUrl}\n\nPage content:\n${content}`,
          },
        ],
      },
    ],
    text: {
      format: recipeExtractionResponseFormat,
    },
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new RecipeExtractionError("Model returned no structured output");
  }

  const result = recipeExtractionSchema.safeParse(parsed);

  if (!result.success) {
    throw new RecipeValidationError(result.error.message);
  }

  return result.data;
}
