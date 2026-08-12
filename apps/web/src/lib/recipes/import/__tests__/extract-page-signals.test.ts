import { describe, expect, it } from "vitest";

import { extractPageSignals } from "@/lib/recipes/import/extract-page-signals";

describe("extractPageSignals", () => {
  it("prefers Open Graph metadata and keeps JSON-LD ingredients/instructions", () => {
    const html = `
      <html>
        <head>
          <title>HTML Pancakes</title>
          <meta property="og:title" content="OG Pancakes" />
          <meta name="description" content="HTML description" />
          <meta property="og:description" content="OG description" />
          <meta property="og:image" content="https://cdn.example.com/pancakes.jpg" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "JSON-LD Pancakes",
              "description": "JSON-LD description",
              "recipeYield": "4 servings",
              "prepTime": "PT10M",
              "cookTime": "PT15M",
              "recipeIngredient": ["1 cup flour", "1 egg"],
              "recipeInstructions": ["Mix", "Cook"]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractPageSignals({ html })).toEqual({
      metadata: {
        title: "OG Pancakes",
        description: "OG description",
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
    });
  });

  it("ignores malformed JSON-LD blocks and still returns metadata", () => {
    const html = `
      <meta property="og:title" content="Broken JSON-LD Page" />
      <script type="application/ld+json">{ not valid json }</script>
    `;

    expect(extractPageSignals({ html })).toEqual({
      metadata: {
        title: "Broken JSON-LD Page",
        description: null,
        image: null,
      },
      recipe: {
        title: null,
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: [],
        instructions: [],
      },
    });
  });
});
