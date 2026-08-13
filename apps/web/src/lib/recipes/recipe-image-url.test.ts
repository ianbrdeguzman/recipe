import { describe, expect, it, vi } from "vitest";

describe("getRecipeImagePublicUrl", () => {
  it("builds a public Supabase storage URL from an image key", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");

    const { getRecipeImagePublicUrl } = await import("./recipe-image-url");

    expect(getRecipeImagePublicUrl("imported/imported-1.webp")).toBe(
      "https://project.supabase.co/storage/v1/object/public/recipe-images/imported/imported-1.webp",
    );
  });

  it("returns null when there is no image key", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");

    const { getRecipeImagePublicUrl } = await import("./recipe-image-url");

    expect(getRecipeImagePublicUrl(null)).toBeNull();
  });
});
