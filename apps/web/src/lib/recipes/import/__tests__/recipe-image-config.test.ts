import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  vi.resetModules();
});

describe("recipe image config", () => {
  it("allows optimized remote images from the configured Supabase storage host", async () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";

    const { default: nextConfig } = await import("../../../../../next.config");

    expect(nextConfig.images?.remotePatterns?.map(String)).toEqual(
      expect.arrayContaining([
        "https://project.supabase.co/storage/v1/object/public/recipe-images/**",
      ]),
    );
  });
});
