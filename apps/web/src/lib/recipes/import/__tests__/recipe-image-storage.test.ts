import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecipeImagePublicUrl } from "@/lib/recipes/recipe-image-url";

const sharpMock = vi.fn();

vi.mock("sharp", () => ({
  default: sharpMock,
}));

describe("recipe image storage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("derives the public URL from the imageKey", () => {
    expect(getRecipeImagePublicUrl("imported/imported-1.webp")).toBe(
      "https://project.supabase.co/storage/v1/object/public/recipe-images/imported/imported-1.webp",
    );
    expect(getRecipeImagePublicUrl(null)).toBeNull();
  });

  it("downloads, converts, and uploads an imported recipe image as webp", async () => {
    const upstreamBytes = new Uint8Array([1, 2, 3]);
    const webpBytes = Buffer.from([4, 5, 6]);

    sharpMock.mockReturnValue({
      webp: vi.fn().mockReturnValue({
        toBuffer: vi.fn().mockResolvedValue(webpBytes),
      }),
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(upstreamBytes.buffer),
      })
      .mockResolvedValueOnce({ ok: true });

    vi.stubGlobal("fetch", fetchMock);

    const { storeImportedRecipeImage } = await import(
      "@/lib/recipes/import/recipe-image-storage"
    );

    await expect(
      storeImportedRecipeImage({
        importedRecipeId: "imported-1",
        imageUrl: "https://cdn.example.com/pancakes.jpg",
      }),
    ).resolves.toBe("imported/imported-1.webp");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://cdn.example.com/pancakes.jpg",
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/storage/v1/object/recipe-images/imported/imported-1.webp",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer service-role-key",
          apikey: "service-role-key",
          "content-type": "image/webp",
          "x-upsert": "true",
        }),
      }),
    );

    const uploadCall = fetchMock.mock.calls[1];
    const uploadOptions = uploadCall?.[1] as { body: Uint8Array };

    expect(uploadOptions.body).toBeInstanceOf(Uint8Array);
    expect(Array.from(uploadOptions.body)).toEqual(Array.from(webpBytes));
  });

  it("returns null when image download fails so recipe import can continue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    const { storeImportedRecipeImage } = await import(
      "@/lib/recipes/import/recipe-image-storage"
    );

    await expect(
      storeImportedRecipeImage({
        importedRecipeId: "imported-1",
        imageUrl: "https://cdn.example.com/missing.jpg",
      }),
    ).resolves.toBeNull();
  });
});
