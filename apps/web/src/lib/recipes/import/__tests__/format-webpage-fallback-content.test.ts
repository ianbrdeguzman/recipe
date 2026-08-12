import { describe, expect, it } from "vitest";

import { formatWebpageFallbackContent } from "@/lib/recipes/import/format-webpage-fallback-content";

describe("formatWebpageFallbackContent", () => {
  it("prepends deterministic metadata and structured recipe context before markdown", () => {
    expect(
      formatWebpageFallbackContent({
        metadata: {
          title: "Metadata Pancakes",
          description: "Fluffy pancakes from metadata",
          image: "https://cdn.example.com/pancakes.jpg",
        },
        recipe: {
          title: "JSON-LD Pancakes",
          description: "JSON-LD description",
          servings: 4,
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          ingredients: ["1 cup flour", "1 egg"],
          instructions: ["Mix", "Cook"],
        },
        markdown: "# Pancakes\n\nBody copy",
      }),
    ).toBe(`Page metadata:\nTitle: Metadata Pancakes\nDescription: Fluffy pancakes from metadata\nImage: https://cdn.example.com/pancakes.jpg\n\nStructured recipe data found:\nJSON-LD title: JSON-LD Pancakes\nJSON-LD description: JSON-LD description\nServings: 4\nPrep time: 10 minutes\nCook time: 15 minutes\nIngredients:\n- 1 cup flour\n- 1 egg\nInstructions:\n- Mix\n- Cook\n\nPage content:\n# Pancakes\n\nBody copy`);
  });
});
