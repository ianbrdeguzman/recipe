import { describe, expect, it } from "vitest";

import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

describe("reconstructUrlFromSlug", () => {
  it("rebuilds a root-domain URL", () => {
    expect(reconstructUrlFromSlug(["https:", "cafedelites.com"])).toBe(
      "https://cafedelites.com",
    );
  });

  it("rebuilds a URL with nested path segments", () => {
    expect(
      reconstructUrlFromSlug([
        "https:",
        "cafedelites.com",
        "best-fluffy-pancakes",
      ]),
    ).toBe("https://cafedelites.com/best-fluffy-pancakes");
  });

  it("drops a trailing slash represented by an empty final segment", () => {
    expect(
      reconstructUrlFromSlug([
        "https:",
        "cafedelites.com",
        "best-fluffy-pancakes",
        "",
      ]),
    ).toBe("https://cafedelites.com/best-fluffy-pancakes");
  });

  it("returns null for an unsupported scheme", () => {
    expect(reconstructUrlFromSlug(["ftp:", "cafedelites.com"])).toBeNull();
  });

  it("returns null when the host is missing", () => {
    expect(reconstructUrlFromSlug(["https:", ""])).toBeNull();
  });

  it("returns null when fewer than two segments are provided", () => {
    expect(reconstructUrlFromSlug(["https:"])).toBeNull();
  });

  it("returns null when slug is undefined", () => {
    expect(reconstructUrlFromSlug(undefined)).toBeNull();
  });
});
