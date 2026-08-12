import { describe, expect, it } from "vitest";

import { extractPageSignals } from "@/lib/recipes/import/extract-page-signals";
import { extractRecipeFromJsonLd } from "@/lib/recipes/import/extract-recipe-from-json-ld";

describe("extractRecipeFromJsonLd", () => {
  it("extracts a complete recipe from JSON-LD", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Best Fluffy Pancakes",
              "recipeYield": ["12", "12 pancakes"],
              "prepTime": "PT5M",
              "cookTime": "PT20M",
              "recipeIngredient": ["2 cups flour", "1 egg"],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Mix ingredients" },
                { "@type": "HowToStep", "text": "Cook pancakes" }
              ]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractRecipeFromJsonLd({ signals: extractPageSignals({ html }) })).toEqual({
      title: "Best Fluffy Pancakes",
      description: null,
      imageUrl: null,
      servings: 12,
      prepTimeMinutes: 5,
      cookTimeMinutes: 20,
      ingredients: ["2 cups flour", "1 egg"],
      instructions: ["Mix ingredients", "Cook pancakes"],
    });
  });

  it("decodes HTML entities from JSON-LD strings", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Best Fluffy Pancakes",
          "description": "Karina&#039;s best pancakes",
          "recipeYield": ["12 pancakes"],
          "prepTime": "PT5M",
          "cookTime": "PT20M",
          "recipeIngredient": ["1 cup flour&nbsp;"],
          "recipeInstructions": ["Don&#039;t overmix"]
        }
      </script>
    `;

    expect(extractRecipeFromJsonLd({ signals: extractPageSignals({ html }) })).toEqual({
      title: "Best Fluffy Pancakes",
      description: "Karina's best pancakes",
      imageUrl: null,
      servings: 12,
      prepTimeMinutes: 5,
      cookTimeMinutes: 20,
      ingredients: ["1 cup flour"],
      instructions: ["Don't overmix"],
    });
  });

  it("uses metadata title, description, and imageUrl when JSON-LD recipe fields are otherwise complete", () => {
    const html = `
      <html>
        <head>
          <title>HTML title should lose to OG title</title>
          <meta property="og:title" content="Metadata Pancakes" />
          <meta property="og:description" content="Metadata description" />
          <meta property="og:image" content="https://cdn.example.com/pancakes.jpg" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "JSON-LD Pancakes",
              "description": "JSON-LD description",
              "recipeYield": ["12 pancakes"],
              "prepTime": "PT5M",
              "cookTime": "PT20M",
              "recipeIngredient": ["2 cups flour", "1 egg"],
              "recipeInstructions": ["Mix ingredients", "Cook pancakes"]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractRecipeFromJsonLd({ signals: extractPageSignals({ html }) })).toEqual({
      title: "Metadata Pancakes",
      description: "Metadata description",
      imageUrl: "https://cdn.example.com/pancakes.jpg",
      servings: 12,
      prepTimeMinutes: 5,
      cookTimeMinutes: 20,
      ingredients: ["2 cups flour", "1 egg"],
      instructions: ["Mix ingredients", "Cook pancakes"],
    });
  });

  it("returns null when metadata exists but JSON-LD ingredients and instructions are missing", () => {
    const html = `
      <meta property="og:title" content="Metadata Only Pancakes" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "recipeYield": "4 servings"
        }
      </script>
    `;

    expect(extractRecipeFromJsonLd({ signals: extractPageSignals({ html }) })).toBeNull();
  });

  it("returns null when JSON-LD is incomplete", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Best Fluffy Pancakes",
          "recipeIngredient": ["2 cups flour", "1 egg"],
          "recipeInstructions": ["Mix ingredients", "Cook pancakes"]
        }
      </script>
    `;

    expect(extractRecipeFromJsonLd({ signals: extractPageSignals({ html }) })).toBeNull();
  });
});
