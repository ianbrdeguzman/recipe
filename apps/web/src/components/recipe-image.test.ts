import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

vi.mock("@/lib/recipes/import/recipe-image-storage", () => ({
  getRecipeImagePublicUrl: vi.fn((imageKey: string | null | undefined) =>
    imageKey
      ? `https://project.supabase.co/storage/v1/object/public/recipe-images/${imageKey}`
      : null,
  ),
}));

import { RecipeImage } from "@/components/recipe-image";

describe("RecipeImage", () => {
  it("renders nothing when no image URL can be derived", () => {
    const markup = renderToStaticMarkup(
      createElement(RecipeImage, {
        imageKey: null,
        title: "Pancakes",
        variant: "thumbnail",
      }),
    );

    expect(markup).toBe("");
  });

  it("renders an image with the derived URL and title-based alt text", () => {
    const markup = renderToStaticMarkup(
      createElement(RecipeImage, {
        imageKey: "imported/imported-1.webp",
        title: "Pancakes",
        variant: "hero",
      }),
    );

    expect(markup).toContain(
      "https://project.supabase.co/storage/v1/object/public/recipe-images/imported/imported-1.webp",
    );
    expect(markup).toContain('alt="Pancakes recipe image"');
  });

  it("uses the full available width for the preview variant", () => {
    const markup = renderToStaticMarkup(
      createElement(RecipeImage, {
        imageKey: "imported/imported-1.webp",
        title: "Pancakes",
        variant: "preview",
      }),
    );

    expect(markup).toContain("w-full");
    expect(markup).not.toContain("max-w-xl");
  });
});
