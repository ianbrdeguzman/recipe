import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/recipes/import/import-recipe-from-url", () => ({
  importRecipeFromUrl: vi.fn(),
}));

import { POST } from "@/app/api/recipes/import/route";
import { auth } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";

describe("POST /api/recipes/import", () => {
  it("returns 401 when there is no authenticated user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/recipe" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 200 with the created recipe on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      importedRecipeId: null,
      normalizedSourceUrl: null,
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(
      new Request("http://localhost/api/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/recipe" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: "recipe-1" });
  });

  it("returns an existing saved recipe when the user imports the same normalized URL again", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      importedRecipeId: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const response = await POST(
      new Request("http://localhost/api/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: "https://EXAMPLE.com/recipe/" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "recipe-1",
      normalizedSourceUrl: "https://example.com/recipe",
    });
  });
});
