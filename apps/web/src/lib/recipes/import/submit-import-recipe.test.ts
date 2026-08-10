import { afterEach, describe, expect, it, vi } from "vitest";

import { submitImportRecipe } from "@/lib/recipes/import/submit-import-recipe";

describe("submitImportRecipe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the URL and returns the created recipe id on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "recipe-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitImportRecipe({ url: "https://example.com/pancakes" }),
    ).resolves.toEqual({ ok: true, data: { id: "recipe-1" } });

    expect(fetchMock).toHaveBeenCalledWith("/api/recipes/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com/pancakes" }),
    });
  });

  it("returns validation errors from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Invalid import data",
            fieldErrors: { url: ["Enter a valid URL."] },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      submitImportRecipe({ url: "notaurl" }),
    ).resolves.toEqual({
      ok: false,
      error: "Invalid import data",
      fieldErrors: { url: ["Enter a valid URL."] },
    });
  });

  it("returns a fallback error when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(
      submitImportRecipe({ url: "https://example.com/pancakes" }),
    ).resolves.toEqual({
      ok: false,
      error: "Could not import recipe.",
      fieldErrors: {},
    });
  });
});
