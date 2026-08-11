import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const srcRoot = __dirname;

function readSource(relativePath: string) {
  return readFileSync(path.join(srcRoot, relativePath), "utf8");
}

describe("theme tokens", () => {
  it("uses a manual dark theme selector instead of prefers-color-scheme", () => {
    const globalsCss = readSource("app/globals.css");

    expect(globalsCss).not.toContain("prefers-color-scheme");
    expect(globalsCss).toContain(':root[data-theme="dark"]');
  });

  it("uses semantic theme tokens on the new recipe page", () => {
    const pageSource = readSource("app/(app)/recipes/new/page.tsx");

    expect(pageSource).toContain("text-muted-foreground");
    expect(pageSource).toContain("text-foreground");
    expect(pageSource).toContain("bg-card");
    expect(pageSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses semantic theme tokens on the recipes list page", () => {
    const pageSource = readSource("app/(app)/recipes/page.tsx");

    expect(pageSource).toContain("text-muted-foreground");
    expect(pageSource).toContain("text-foreground");
    expect(pageSource).toContain("bg-card");
    expect(pageSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses semantic theme tokens on the import recipe page", () => {
    const pageSource = readSource("app/(app)/recipes/import/page.tsx");

    expect(pageSource).toContain("text-muted-foreground");
    expect(pageSource).toContain("text-foreground");
    expect(pageSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses semantic theme tokens on the home page", () => {
    const pageSource = readSource("app/page.tsx");

    expect(pageSource).toContain("bg-background");
    expect(pageSource).toContain("text-muted-foreground");
    expect(pageSource).toContain("text-foreground");
    expect(pageSource).toContain("bg-card");
    expect(pageSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses shared token-based UI primitives in the recipe form", () => {
    const formSource = readSource("components/recipe-form.tsx");

    expect(formSource).toContain("@/components/ui/button");
    expect(formSource).toContain("@/components/ui/input");
    expect(formSource).toContain("@/components/ui/textarea");
    expect(formSource).toContain("text-foreground");
    expect(formSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses semantic theme tokens on remaining pages and layouts", () => {
    const rootNotFoundSource = readSource("app/not-found.tsx");
    const appLayoutSource = readSource("app/(app)/layout.tsx");
    const appNotFoundSource = readSource("app/(app)/not-found.tsx");
    const recipeDetailSource = readSource("app/(app)/recipes/[id]/page.tsx");
    const editRecipeSource = readSource("app/(app)/recipes/[id]/edit/page.tsx");

    expect(rootNotFoundSource).not.toMatch(/zinc-|bg-white/);
    expect(appLayoutSource).not.toMatch(/zinc-|bg-white/);
    expect(appNotFoundSource).not.toMatch(/zinc-|bg-white/);
    expect(recipeDetailSource).not.toMatch(/zinc-|bg-white/);
    expect(editRecipeSource).not.toMatch(/zinc-|bg-white/);
  });

  it("uses shared token-based UI primitives in supporting route components", () => {
    const importFormSource = readSource("components/import-recipe-form.tsx");
    const signInButtonSource = readSource("components/signin-button.tsx");
    const signOutButtonSource = readSource("components/signout-button.tsx");
    const pagePlaceholderSource = readSource("components/page-placeholder.tsx");
    const deleteRecipeSource = readSource("components/delete-recipe-button.tsx");
    const appNavSource = readSource("components/app-nav.tsx");

    expect(importFormSource).not.toMatch(/zinc-|bg-white/);
    expect(signInButtonSource).not.toMatch(/zinc-|bg-white/);
    expect(signOutButtonSource).not.toMatch(/zinc-|bg-white/);
    expect(pagePlaceholderSource).not.toMatch(/zinc-|bg-white/);
    expect(deleteRecipeSource).not.toMatch(/zinc-|bg-white/);
    expect(appNavSource).not.toMatch(/zinc-|bg-white/);
  });
});
