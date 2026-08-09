import { describe, expect, it } from "vitest";

import { detectImportSourceType } from "@/lib/recipes/import/source-type";

describe("detectImportSourceType", () => {
  it("classifies a normal recipe website as webpage", () => {
    expect(
      detectImportSourceType(
        new URL(
          "https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/",
        ),
      ),
    ).toBe("webpage");
  });
});
