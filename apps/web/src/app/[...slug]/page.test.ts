import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");
const redirectError = (destination: string) =>
  Object.assign(new Error("NEXT_REDIRECT"), { destination });

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
  redirect: vi.fn((destination: string) => {
    throw redirectError(destination);
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/recipes/import/reconstruct-url-from-slug", () => ({
  reconstructUrlFromSlug: vi.fn(),
}));

vi.mock("@/lib/recipes/import/import-recipe-from-url", () => ({
  importRecipeFromUrl: vi.fn(),
}));

import CatchAllImportPage from "@/app/[...slug]/page";
import { auth } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

describe("CatchAllImportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound when the slug cannot be reconstructed", async () => {
    vi.mocked(reconstructUrlFromSlug).mockReturnValue(null);

    await expect(
      CatchAllImportPage({
        params: Promise.resolve({ slug: ["https:"] }),
      } as PageProps<"/[...slug]">),
    ).rejects.toMatchObject({ message: "NEXT_NOT_FOUND" });
  });

  it("redirects signed-out users to the home page", async () => {
    vi.mocked(reconstructUrlFromSlug).mockReturnValue(
      "https://example.com/pancakes",
    );
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    await expect(
      CatchAllImportPage({
        params: Promise.resolve({ slug: ["https:", "example.com"] }),
      } as PageProps<"/[...slug]">),
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      destination: "/",
    });
  });

  it("redirects to the recipe detail page after a successful import", async () => {
    vi.mocked(reconstructUrlFromSlug).mockReturnValue(
      "https://example.com/pancakes",
    );
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockResolvedValue({ id: "recipe-1" } as never);

    await expect(
      CatchAllImportPage({
        params: Promise.resolve({ slug: ["https:", "example.com"] }),
      } as PageProps<"/[...slug]">),
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      destination: "/recipes/recipe-1",
    });

    expect(importRecipeFromUrl).toHaveBeenCalledWith({
      url: "https://example.com/pancakes",
      userId: "user-1",
    });
  });

  it("rethrows the import error when the import fails", async () => {
    vi.mocked(reconstructUrlFromSlug).mockReturnValue(
      "https://example.com/pancakes",
    );
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockRejectedValue(new Error("Import failed"));

    await expect(
      CatchAllImportPage({
        params: Promise.resolve({ slug: ["https:", "example.com"] }),
      } as PageProps<"/[...slug]">),
    ).rejects.toThrow("Import failed");
  });
});
