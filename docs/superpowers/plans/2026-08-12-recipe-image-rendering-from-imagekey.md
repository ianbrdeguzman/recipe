# Recipe Image Rendering From `imageKey` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render recipe images from persisted `imageKey` values on the recipes list, recipe detail, and recipe edit pages.

**Architecture:** Add one small shared recipe image component that derives the public URL from `imageKey` and renders `next/image` with page-specific display variants. Then wire `imageKey` into the list query, render the shared component in the three target pages, and configure Next.js to allow the Supabase storage host via strict remote image patterns.

**Tech Stack:** Next.js 16 App Router, TypeScript, React Server Components, `next/image`, Drizzle ORM, Vitest

## Global Constraints

- Reuse the existing `getRecipeImagePublicUrl(imageKey)` helper.
- Add one shared presentational component for recipe image rendering.
- Render nothing when `imageKey` is `null` or cannot be converted to a public URL.
- Keep the current data model unchanged.
- Keep edit behavior unchanged; the edit page only shows a read-only preview.
- Use `next/image` for rendering.
- Because the source URL is remote and derived from Supabase Storage, the app must allow the Supabase host in `next.config.ts` via strict `images.remotePatterns`.
- The image component should prefer `fill` with a relatively positioned wrapper and `sizes` so layout remains stable without knowing the upstream image dimensions.
- No image upload or replacement UI.
- No fallback placeholders.
- No schema or API changes.
- No changes to recipe import behavior.

---

### Task 1: Add a failing test for Supabase image host configuration

**Files:**
- Modify: `apps/web/next.config.ts`
- Create: `apps/web/src/lib/recipes/import/__tests__/recipe-image-config.test.ts`

**Interfaces:**
- Consumes: `nextConfig: NextConfig`
- Produces: `nextConfig.images.remotePatterns: Array<{ protocol: string; hostname: string; port?: string; pathname?: string; search?: string }>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import nextConfig from "../../../../next.config";

describe("recipe image config", () => {
  it("allows optimized remote images from the configured Supabase storage host", () => {
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "https",
          hostname: "project.supabase.co",
          pathname: "/storage/v1/object/public/recipe-images/**",
        }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test recipe-image-config.test.ts`
Expected: FAIL because `images.remotePatterns` is missing.

- [ ] **Step 3: Write minimal implementation**

```ts
import path from "node:path";

import type { NextConfig } from "next";

function getSupabaseImageRemotePattern() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  const { protocol, hostname, port } = new URL(supabaseUrl);

  return [
    {
      protocol: protocol.replace(":", ""),
      hostname,
      port,
      pathname: "/storage/v1/object/public/recipe-images/**",
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getSupabaseImageRemotePattern(),
  },
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `SUPABASE_URL=https://project.supabase.co pnpm --filter web test recipe-image-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/next.config.ts apps/web/src/lib/recipes/import/__tests__/recipe-image-config.test.ts
git commit -m "test(web): configure supabase recipe image host"
```

### Task 2: Add a shared recipe image component with variant-based rendering

**Files:**
- Create: `apps/web/src/components/recipe-image.tsx`
- Create: `apps/web/src/components/__tests__/recipe-image.test.tsx`

**Interfaces:**
- Consumes: `getRecipeImagePublicUrl(imageKey: string | null | undefined): string | null`
- Produces: `RecipeImage(props: { imageKey: string | null | undefined; title: string; variant: "thumbnail" | "hero" | "preview" }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@/lib/recipes/import/recipe-image-storage", () => ({
  getRecipeImagePublicUrl: vi.fn((imageKey: string | null | undefined) =>
    imageKey
      ? `https://project.supabase.co/storage/v1/object/public/recipe-images/${imageKey}`
      : null,
  ),
}));

import { RecipeImage } from "../recipe-image";

describe("RecipeImage", () => {
  it("renders nothing when no image URL can be derived", () => {
    const markup = renderToStaticMarkup(
      <RecipeImage imageKey={null} title="Pancakes" variant="thumbnail" />,
    );

    expect(markup).toBe("");
  });

  it("renders an image with the derived URL and title-based alt text", () => {
    const markup = renderToStaticMarkup(
      <RecipeImage
        imageKey="imported/imported-1.webp"
        title="Pancakes"
        variant="hero"
      />,
    );

    expect(markup).toContain(
      "https://project.supabase.co/storage/v1/object/public/recipe-images/imported/imported-1.webp",
    );
    expect(markup).toContain('alt="Pancakes recipe image"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test recipe-image.test.tsx`
Expected: FAIL because `RecipeImage` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
import Image from "next/image";

import { getRecipeImagePublicUrl } from "@/lib/recipes/import/recipe-image-storage";

const variantStyles = {
  thumbnail: {
    wrapperClassName: "relative h-24 w-24 overflow-hidden rounded-xl shrink-0",
    sizes: "96px",
  },
  hero: {
    wrapperClassName: "relative aspect-[16/9] w-full overflow-hidden rounded-2xl",
    sizes: "(max-width: 1024px) 100vw, 896px",
  },
  preview: {
    wrapperClassName: "relative aspect-[16/9] w-full max-w-xl overflow-hidden rounded-2xl",
    sizes: "(max-width: 768px) 100vw, 576px",
  },
} as const;

export function RecipeImage({
  imageKey,
  title,
  variant,
}: {
  imageKey: string | null | undefined;
  title: string;
  variant: keyof typeof variantStyles;
}) {
  const src = getRecipeImagePublicUrl(imageKey);

  if (!src) {
    return null;
  }

  const selectedVariant = variantStyles[variant];

  return (
    <div className={selectedVariant.wrapperClassName}>
      <Image
        src={src}
        alt={`${title} recipe image`}
        fill
        sizes={selectedVariant.sizes}
        className="object-cover"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test recipe-image.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/recipe-image.tsx apps/web/src/components/__tests__/recipe-image.test.tsx
git commit -m "feat(web): add shared recipe image component"
```

### Task 3: Render thumbnails on the recipes list page

**Files:**
- Modify: `apps/web/src/app/(app)/recipes/page.tsx`

**Interfaces:**
- Consumes: `RecipeImage(props: { imageKey: string | null | undefined; title: string; variant: "thumbnail" | "hero" | "preview" }): JSX.Element | null`
- Produces: list query result items including `imageKey: string | null`

- [ ] **Step 1: Write the failing test**

```ts
it("selects imageKey for each recipe card", async () => {
  const query = getRecipesForCurrentUser.toString();
  expect(query).toContain("imageKey: recipe.imageKey");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test recipes-page.test.ts`
Expected: FAIL because the query does not select `imageKey` and the page test does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { RecipeImage } from "@/components/recipe-image";

// in the select block
imageKey: recipe.imageKey,

// in each list item layout
<div className="flex gap-4">
  <RecipeImage
    imageKey={item.imageKey}
    title={item.title}
    variant="thumbnail"
  />

  <div className="min-w-0 flex-1">
    {/* existing title/description/meta content */}
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test recipes-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(app)'/recipes/page.tsx
git commit -m "feat(web): render recipe thumbnails in recipes list"
```

### Task 4: Render the hero image on the recipe detail page

**Files:**
- Modify: `apps/web/src/app/(app)/recipes/[id]/page.tsx`

**Interfaces:**
- Consumes: `RecipeImage(props: { imageKey: string | null | undefined; title: string; variant: "thumbnail" | "hero" | "preview" }): JSX.Element | null`
- Produces: detail page rendering with `selectedRecipe.imageKey`

- [ ] **Step 1: Write the failing test**

```ts
it("renders the shared recipe image on the detail page", async () => {
  const pageSource = RecipeDetailPage.toString();
  expect(pageSource).toContain('variant="hero"');
  expect(pageSource).toContain("selectedRecipe.imageKey");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test recipe-detail-page.test.ts`
Expected: FAIL because the page does not render `RecipeImage` and the test file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { RecipeImage } from "@/components/recipe-image";

// after the top header block
<RecipeImage
  imageKey={selectedRecipe.imageKey}
  title={selectedRecipe.title}
  variant="hero"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test recipe-detail-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(app)'/recipes/'[id]'/page.tsx
git commit -m "feat(web): render recipe hero image on detail page"
```

### Task 5: Render the preview image on the recipe edit page

**Files:**
- Modify: `apps/web/src/app/(app)/recipes/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `RecipeImage(props: { imageKey: string | null | undefined; title: string; variant: "thumbnail" | "hero" | "preview" }): JSX.Element | null`
- Produces: edit page rendering with `selectedRecipe.imageKey`

- [ ] **Step 1: Write the failing test**

```ts
it("renders the shared recipe image preview above the form", async () => {
  const pageSource = EditRecipePage.toString();
  expect(pageSource).toContain('variant="preview"');
  expect(pageSource).toContain("selectedRecipe.imageKey");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test edit-recipe-page.test.ts`
Expected: FAIL because the page does not render `RecipeImage` and the test file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { RecipeImage } from "@/components/recipe-image";

// before the form card
<RecipeImage
  imageKey={selectedRecipe.imageKey}
  title={selectedRecipe.title}
  variant="preview"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test edit-recipe-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(app)'/recipes/'[id]'/edit/page.tsx
git commit -m "feat(web): render recipe image preview on edit page"
```

### Task 6: Verify the integrated behavior and type safety

**Files:**
- Modify if needed: `apps/web/src/components/recipe-image.tsx`
- Modify if needed: `apps/web/src/app/(app)/recipes/page.tsx`
- Modify if needed: `apps/web/src/app/(app)/recipes/[id]/page.tsx`
- Modify if needed: `apps/web/src/app/(app)/recipes/[id]/edit/page.tsx`
- Modify if needed: `apps/web/next.config.ts`

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified page rendering and passing type checks

- [ ] **Step 1: Run the focused test suite**

Run:
```bash
SUPABASE_URL=https://project.supabase.co pnpm --filter web test recipe-image-config.test.ts recipe-image.test.tsx recipes-page.test.ts recipe-detail-page.test.ts edit-recipe-page.test.ts
```
Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```
Expected: PASS with no type errors.

- [ ] **Step 3: Fix any integration issues with the smallest possible change**

```tsx
// Example only if type narrowing is needed
const imageKey = selectedRecipe.imageKey ?? null;

<RecipeImage imageKey={imageKey} title={selectedRecipe.title} variant="hero" />
```

- [ ] **Step 4: Re-run verification**

Run:
```bash
SUPABASE_URL=https://project.supabase.co pnpm --filter web test recipe-image-config.test.ts recipe-image.test.tsx recipes-page.test.ts recipe-detail-page.test.ts edit-recipe-page.test.ts
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/next.config.ts apps/web/src/components/recipe-image.tsx apps/web/src/app/'(app)'/recipes/page.tsx apps/web/src/app/'(app)'/recipes/'[id]'/page.tsx apps/web/src/app/'(app)'/recipes/'[id]'/edit/page.tsx apps/web/src/components/__tests__/recipe-image.test.tsx apps/web/src/lib/recipes/import/__tests__/recipe-image-config.test.ts
git commit -m "feat(web): render recipe images from imagekey"
```
