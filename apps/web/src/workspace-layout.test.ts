import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

describe("workspace layout", () => {
  it("moves the Next.js app into apps/web and leaves apps/mobile as an empty directory", () => {
    expect(existsSync(path.join(repoRoot, "apps/web/package.json"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "apps/web/src/app"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "apps/web/public"))).toBe(true);

    expect(existsSync(path.join(repoRoot, "apps/mobile"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "apps/mobile/package.json"))).toBe(false);
  });

  it("uses a workspace root package and a web app package", () => {
    const rootPackage = readJson<{ scripts: Record<string, string> }>(
      path.join(repoRoot, "package.json"),
    );
    const webPackage = readJson<{ name: string; scripts: Record<string, string> }>(
      path.join(repoRoot, "apps/web/package.json"),
    );

    expect(rootPackage.scripts.dev).toContain("--filter");
    expect(rootPackage.scripts.build).toContain("--filter");
    expect(webPackage.name).toBe("web");
    expect(webPackage.scripts.dev).toBe("next dev");
  });
});
