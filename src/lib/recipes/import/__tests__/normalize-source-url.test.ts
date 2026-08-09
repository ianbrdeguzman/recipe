import { describe, expect, it } from "vitest";

import { normalizeRecipeSourceUrl } from "@/lib/recipes/import/normalize-source-url";

describe("normalizeRecipeSourceUrl", () => {
  it("lowercases host, strips default port, and trims a trailing slash", () => {
    expect(
      normalizeRecipeSourceUrl(
        "https://WWW.Example.com:443/recipe/pancakes/?utm_source=ignored",
      ),
    ).toBe("https://www.example.com/recipe/pancakes?utm_source=ignored");
  });

  it("preserves query string and non-default port", () => {
    expect(
      normalizeRecipeSourceUrl("http://example.com:8080/recipe?id=42"),
    ).toBe("http://example.com:8080/recipe?id=42");
  });
});
