import OpenAI from "openai";

import { recipeExtractionSchema } from "./extraction-schema";
import { RecipeExtractionError, RecipeValidationError } from "./errors";

const DEFAULT_MODEL = "gpt-5-mini";

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
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Extract a recipe from webpage text. Return JSON only. Do not invent values. Use null for missing optional fields. Ingredients and instructions must be arrays.",
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
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new RecipeExtractionError("Model returned non-JSON output");
  }

  const result = recipeExtractionSchema.safeParse(parsed);

  if (!result.success) {
    throw new RecipeValidationError(result.error.message);
  }

  return result.data;
}
