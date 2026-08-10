import { describe, expect, it, vi } from "vitest";

import { UpstreamFetchError } from "@/lib/recipes/import/errors";
import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";

describe("fetchWithJina", () => {
  it("calls the Jina reader endpoint for the source URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Title\n\nIngredients\n- flour\n\nInstructions\n- mix", {
        status: 200,
      }),
    );

    const result = await fetchWithJina({
      url: new URL("https://example.com/recipe"),
      fetchImpl,
      timeoutMs: 1000,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://r.jina.ai/https://example.com/recipe",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.content).toContain("Ingredients");
  });

  it("throws UpstreamFetchError for non-OK responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("blocked", { status: 403 }),
    );

    await expect(
      fetchWithJina({
        url: new URL("https://example.com/recipe"),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(UpstreamFetchError);
  });

  it("throws UpstreamFetchError for empty content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("   ", { status: 200 }));

    await expect(
      fetchWithJina({
        url: new URL("https://example.com/recipe"),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(UpstreamFetchError);
  });

  it("normalizes blank lines and trims oversized content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(`Header\n\n\nIngredients\n- flour\n${"x".repeat(500)}`, {
        status: 200,
      }),
    );

    const result = await fetchWithJina({
      url: new URL("https://example.com/recipe"),
      fetchImpl,
      maxChars: 60,
    });

    expect(result.content).not.toContain("\n\n\n");
    expect(result.content.length).toBe(60);
  });
});
