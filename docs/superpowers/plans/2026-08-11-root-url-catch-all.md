# Root URL Catch-All Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a root optional catch-all App Router page that reconstructs external recipe URLs from path segments and feeds them into the existing import flow without breaking `/`, `/recipes`, or `/api/*`.

**Architecture:** Keep `apps/web/src/app/page.tsx` as the marketing page and add `apps/web/src/app/[[...slug]]/page.tsx` for unknown root paths. Put path reconstruction in a small pure helper under `src/lib/recipes/import`, then reuse the existing import submission flow by letting `ImportRecipeForm` accept an optional initial URL.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Zod

## Global Constraints

- Follow Next.js 16 App Router behavior from the bundled docs: use `[[...slug]]` and await `params`.
- Preserve existing route behavior exactly: `/` stays marketing, `/recipes` stays the recipes app, `/api/*` stays API routes.
- Do not add middleware, rewrites, proxy files, or a custom server.
- Keep URL validation in `apps/web/src/app/api/recipes/import/route.ts` and existing import schema flow.
- Reconstruct only plain path-segment URLs like `/https://cafedelites.com/best-fluffy-pancakes/`.
- Invalid catch-all values must render `notFound()`.
- Use TDD: no production code before the failing test.
- Use Conventional Commits for every commit.

---

### Task 1: Add a pure URL reconstruction helper with tests

**Files:**
- Create: `apps/web/src/lib/recipes/import/reconstruct-url-from-slug.ts`
- Create: `apps/web/src/lib/recipes/import/reconstruct-url-from-slug.test.ts`

**Interfaces:**
- Produces: `reconstructUrlFromSlug(slug: string[] | undefined): string | null`
- Consumed by later tasks: `apps/web/src/app/[[...slug]]/page.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

describe("reconstructUrlFromSlug", () => {
  it("rebuilds a root-domain URL", () => {
    expect(reconstructUrlFromSlug(["https:", "cafedelites.com"]))
      .toBe("https://cafedelites.com");
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- src/lib/recipes/import/reconstruct-url-from-slug.test.ts`

Expected: FAIL with a module resolution error such as `Cannot find module '@/lib/recipes/import/reconstruct-url-from-slug'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
const SUPPORTED_SCHEMES = new Set(["http:", "https:"]);

export function reconstructUrlFromSlug(
  slug: string[] | undefined,
): string | null {
  if (!slug || slug.length < 2) {
    return null;
  }

  const [scheme, rawHost, ...rawPath] = slug;

  if (!SUPPORTED_SCHEMES.has(scheme)) {
    return null;
  }

  const host = rawHost.trim();

  if (!host) {
    return null;
  }

  const path = rawPath.filter((segment) => segment.length > 0).join("/");

  return path.length > 0 ? `${scheme}//${host}/${path}` : `${scheme}//${host}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- src/lib/recipes/import/reconstruct-url-from-slug.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/recipes/import/reconstruct-url-from-slug.ts apps/web/src/lib/recipes/import/reconstruct-url-from-slug.test.ts
git commit -m "feat(web): add root slug URL reconstruction helper"
```

### Task 2: Let the import form accept a prefilled URL

**Files:**
- Modify: `apps/web/src/components/import-recipe-form.tsx`

**Interfaces:**
- Consumes: `submitImportRecipe({ url: string }): Promise<SubmitImportRecipeResult>`
- Produces: `ImportRecipeForm(props?: { initialUrl?: string }): JSX.Element`
- Consumed by later tasks: `apps/web/src/app/[[...slug]]/page.tsx`

- [ ] **Step 1: Write the failing test**

Create a temporary assertion in `apps/web/src/lib/recipes/import/reconstruct-url-from-slug.test.ts` proving the catch-all workflow needs a prefilled URL contract before route code is written:

```ts
it("provides a canonical URL string for the import form", () => {
  const url = reconstructUrlFromSlug([
    "https:",
    "cafedelites.com",
    "best-fluffy-pancakes",
  ]);

  expect(url).toBe("https://cafedelites.com/best-fluffy-pancakes");
});
```

This should already be green after Task 1, so for this task the failing condition comes from TypeScript when you update the catch-all page in Task 3 to pass `initialUrl` into `ImportRecipeForm` before the prop exists. Do not implement route code yet; first add the prop contract here.

- [ ] **Step 2: Run typecheck to verify the current component contract is still narrow**

Run: `pnpm --filter web typecheck`

Expected: PASS before changes. This is the baseline proving `ImportRecipeForm` currently has no configurable initial URL API.

- [ ] **Step 3: Write the minimal implementation**

```tsx
"use client";

// imports unchanged

type ImportRecipeFormProps = {
  initialUrl?: string;
};

export function ImportRecipeForm({ initialUrl = "" }: ImportRecipeFormProps) {
  const router = useRouter();

  const [url, setUrl] = useState(initialUrl);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // submit handler unchanged
}
```

Keep the rest of the submit behavior unchanged. Do not add auto-submit, effect hooks, or validation duplication.

- [ ] **Step 4: Run typecheck to verify the widened prop contract passes**

Run: `pnpm --filter web typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/import-recipe-form.tsx
git commit -m "feat(web): support prefilled import URLs"
```

### Task 3: Add the root optional catch-all page and wire it to the import flow

**Files:**
- Create: `apps/web/src/app/[[...slug]]/page.tsx`
- Modify: `apps/web/src/app/(app)/recipes/import/page.tsx` (optional only if you choose to share copy/layout with the new page)
- Modify: `apps/web/src/app/page.tsx` (optional only if you extract shared presentation while implementing)

**Interfaces:**
- Consumes: `reconstructUrlFromSlug(slug: string[] | undefined): string | null`
- Consumes: `ImportRecipeForm(props?: { initialUrl?: string }): JSX.Element`
- Produces: root optional catch-all route for URL-shaped paths

- [ ] **Step 1: Write the failing test**

Add a route-focused test file at `apps/web/src/lib/recipes/import/root-url-routing-contract.test.ts` that captures the route contract without needing a full Next renderer:

```ts
import { describe, expect, it } from "vitest";

import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

describe("root URL catch-all contract", () => {
  it("reconstructs the example path payload used by the catch-all page", () => {
    const slug = ["https:", "cafedelites.com", "best-fluffy-pancakes"];

    expect(reconstructUrlFromSlug(slug)).toBe(
      "https://cafedelites.com/best-fluffy-pancakes",
    );
  });
});
```

This test should pass immediately because the helper already exists. The actual failing signal for this task is route absence: visiting the example path in dev will still 404 because `apps/web/src/app/[[...slug]]/page.tsx` does not exist yet.

- [ ] **Step 2: Run the app manually to verify the route currently fails**

Run: `pnpm --filter web dev`

Then open: `http://localhost:3000/https://cafedelites.com/best-fluffy-pancakes/`

Expected: 404 or existing not-found UI because the catch-all route file does not yet exist.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/web/src/app/[[...slug]]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImportRecipeForm } from "@/components/import-recipe-form";
import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

export default async function CatchAllImportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const initialUrl = reconstructUrlFromSlug(slug);

  if (!initialUrl) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          URL import
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Import this recipe
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          We reconstructed the recipe URL from the path. Review it below, then
          import it into your recipe collection.
        </p>
        <div>
          <Link
            href="/"
            className="text-foreground text-sm font-medium underline underline-offset-4"
          >
            Back to home
          </Link>
        </div>
      </div>

      <ImportRecipeForm initialUrl={initialUrl} />
    </section>
  );
}
```

Important implementation rules:

- Await `params` because Next.js 16 passes it as a promise.
- Call `notFound()` when `reconstructUrlFromSlug` returns `null`.
- Do not change `apps/web/src/app/page.tsx`; `/` must remain the marketing page.
- Do not touch `apps/web/src/app/api/recipes/import/route.ts`; validation stays there.
- If you choose to extract shared presentation between `/recipes/import` and the new catch-all page, keep that extraction small and update both pages in the same commit.

- [ ] **Step 4: Run verification**

Run all three commands:

```bash
pnpm --filter web test -- src/lib/recipes/import/reconstruct-url-from-slug.test.ts
pnpm --filter web typecheck
pnpm --filter web test
```

Then verify manually in dev:

- `http://localhost:3000/` shows the existing marketing page
- `http://localhost:3000/recipes` still reaches the recipes app
- `http://localhost:3000/https://cafedelites.com/best-fluffy-pancakes/` shows the import page with the input prefilled to `https://cafedelites.com/best-fluffy-pancakes`
- `http://localhost:3000/not-a-url` renders not found

Expected: all automated checks PASS and manual route checks match the acceptance criteria.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[[...slug]]/page.tsx apps/web/src/components/import-recipe-form.tsx apps/web/src/lib/recipes/import/reconstruct-url-from-slug.ts apps/web/src/lib/recipes/import/reconstruct-url-from-slug.test.ts
git commit -m "feat(web): add root URL catch-all import route"
```

## Self-Review Checklist

- [ ] `reconstructUrlFromSlug` is the only place that decodes root slug arrays into URLs.
- [ ] `apps/web/src/app/page.tsx` is unchanged as the `/` marketing page unless a tiny presentation-only extraction was required.
- [ ] No middleware, rewrite, or proxy files were added.
- [ ] `notFound()` is used for malformed catch-all values.
- [ ] `ImportRecipeForm` only gained `initialUrl`; submit behavior is unchanged.
- [ ] Automated tests and typecheck were re-run after the final route change.
