import { describe, expect, it, vi } from "vitest";

import { UnsupportedImportSourceError } from "@/lib/recipes/import/errors";
import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import { detectImportSourceType } from "@/lib/recipes/import/source-type";

describe("detectImportSourceType", () => {
  it.each([
    ["https://www.instagram.com/reel/abc", "instagram"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://www.tiktok.com/@cook/video/123", "tiktok"],
    [
      "https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/",
      "webpage",
    ],
  ])("maps %s to %s", (value, expected) => {
    expect(detectImportSourceType(new URL(value))).toBe(expected);
  });
});

describe("getRecipeImporter", () => {
  it("returns the webpage importer for webpage URLs", async () => {
    const webpageImporter = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix"],
    });

    const importer = getRecipeImporter({ sourceType: "webpage", webpageImporter });
    await importer({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(webpageImporter).toHaveBeenCalledOnce();
  });

  it("throws for unsupported future platform URLs", () => {
    const webpageImporter = vi.fn();

    expect(() =>
      getRecipeImporter({ sourceType: "instagram", webpageImporter }),
    ).toThrow(UnsupportedImportSourceError);
  });
});
