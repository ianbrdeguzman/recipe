# Slug Import Auto-Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the catch-all slug import form flow with a server-driven auto-import flow that redirects to the recipe detail page on success and renders a route-local recovery UI on import failure.

**Architecture:** The catch-all route remains a server page that reconstructs the URL from `params`, checks auth with the existing `headers()` + `auth.api.getSession()` pattern, and calls `importRecipeFromUrl()` directly. Success ends in `redirect()`, invalid slugs end in `notFound()`, import failures render a dedicated fallback section, and a sibling `loading.tsx` provides route-level progress UI during suspense.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript 5, Vitest 4, Tailwind CSS 4

## Global Constraints

- Follow the existing Next 16 App Router conventions used elsewhere in this repo.
- Keep the change scoped to the slug catch-all route behavior and its direct tests.
- Do not remove the generic manual import infrastructure unless it is proven unused by all flows.
- Visiting a valid slug-import URL while signed in no longer shows an import form.
- Visiting a valid slug-import URL while signed in begins importing immediately.
- A successful import redirects to `/recipes/[id]` for the created or reused user recipe.
- A failed import shows a dedicated fallback UI with manual import and manual creation CTAs.
- Visiting a valid slug-import URL while signed out redirects to `/`.
- Visiting an invalid slug-import URL returns the route not-found experience.
- The route has a dedicated loading UI while import work is in progress.

---

## File Structure

- `apps/web/src/app/[...slug]/page.tsx`
  - Server route entry for the slug import flow.
  - Owns slug reconstruction, auth check, import execution, redirect behavior, and route-local failure UI.
- `apps/web/src/app/[...slug]/page.test.tsx`
  - Route behavior tests for invalid slug, signed-out redirect, successful import redirect, and import failure UI.
- `apps/web/src/app/[...slug]/loading.tsx`
  - Lightweight route-level loading UI shown while auth lookup and import work suspend.
- `apps/web/src/app/[...slug]/loading.test.tsx`
  - Static markup test for the loading UI copy.

### Task 1: Add catch-all route behavior tests

**Files:**
- Create: `apps/web/src/app/[...slug]/page.test.tsx`
- Test: `apps/web/src/app/[...slug]/page.test.tsx`

**Interfaces:**
- Consumes: `CatchAllImportPage({ params }: PageProps<"/[...slug]">): Promise<React.ReactNode>` from `apps/web/src/app/[...slug]/page.tsx`
- Consumes: `reconstructUrlFromSlug(slug: string[] | undefined): string | null`
- Consumes: `auth.api.getSession({ headers }: { headers: Headers }): Promise<{ user?: { id: string } } | null>`
- Consumes: `importRecipeFromUrl({ url, userId }: { url: string; userId: string }): Promise<{ id: string }>`
- Produces: A pinned route test harness for all required slug-import outcomes

- [ ] **Step 1: Write the failing page behavior tests**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
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

  it("renders manual recovery actions when the import fails", async () => {
    vi.mocked(reconstructUrlFromSlug).mockReturnValue(
      "https://example.com/pancakes",
    );
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockRejectedValue(new Error("Import failed"));

    const page = await CatchAllImportPage({
      params: Promise.resolve({ slug: ["https:", "example.com"] }),
    } as PageProps<"/[...slug]">);

    const html = renderToStaticMarkup(page);

    expect(html).toContain("We couldn&#x27;t import this recipe");
    expect(html).toContain('href="/recipes/import"');
    expect(html).toContain('href="/recipes/new"');
    expect(html).not.toContain("Recipe URL");
  });
});
```

- [ ] **Step 2: Run the page test file to verify it fails**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test -- src/app/[...slug]/page.test.tsx`

Expected: FAIL because `apps/web/src/app/[...slug]/page.tsx` does not import `redirect`, does not call `auth.api.getSession()`, does not call `importRecipeFromUrl()`, and still renders the import form.

- [ ] **Step 3: Commit the failing tests before implementation**

```bash
cd /Users/iandeguzman/Desktop/projects/recipe
git add apps/web/src/app/[...slug]/page.test.tsx
git commit -m "test(web): cover slug import auto-import route"
```

### Task 2: Implement the server-driven slug import page

**Files:**
- Modify: `apps/web/src/app/[...slug]/page.tsx`
- Test: `apps/web/src/app/[...slug]/page.test.tsx`

**Interfaces:**
- Consumes: `reconstructUrlFromSlug(slug: string[] | undefined): string | null`
- Consumes: `auth.api.getSession({ headers }: { headers: Headers }): Promise<{ user?: { id: string; name?: string | null; email?: string | null } } | null>`
- Consumes: `importRecipeFromUrl({ url, userId }: { url: string; userId: string }): Promise<{ id: string }>`
- Produces: `CatchAllImportPage({ params }: PageProps<"/[...slug]">): Promise<React.ReactNode>` with these behaviors:
  - invalid slug -> `notFound()`
  - missing user -> `redirect("/")`
  - successful import -> `redirect(`/recipes/${createdRecipe.id}`)`
  - failed import -> route-local error section with `/recipes/import` and `/recipes/new` links

- [ ] **Step 1: Replace the current page implementation with the minimal server-driven flow**

```tsx
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

export default async function CatchAllImportPage({
  params,
}: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const url = reconstructUrlFromSlug(slug);

  if (!url) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  let createdRecipe: { id: string };

  try {
    createdRecipe = await importRecipeFromUrl({
      url,
      userId: session.user.id,
    });
  } catch {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            URL import
          </p>
          <h1 className="text-foreground text-3xl font-semibold">
            We couldn&apos;t import this recipe
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            Automatic import failed for this URL. You can try importing it manually or create the recipe yourself.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/recipes/import"
            className="bg-foreground text-background inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Import recipe manually
          </Link>
          <Link
            href="/recipes/new"
            className="border-border text-foreground inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Create recipe manually
          </Link>
        </div>
      </section>
    );
  }

  redirect(`/recipes/${createdRecipe.id}`);
}
```

- [ ] **Step 2: Run the page test file to verify it passes**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test -- src/app/[...slug]/page.test.tsx`

Expected: PASS with all four route behavior tests green.

- [ ] **Step 3: Run the broader web test suite to verify no regression in existing import behavior**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test`

Expected: PASS, including `src/app/api/recipes/import/route.test.ts` and `src/lib/recipes/import/reconstruct-url-from-slug.test.ts`.

- [ ] **Step 4: Commit the page implementation**

```bash
cd /Users/iandeguzman/Desktop/projects/recipe
git add apps/web/src/app/[...slug]/page.tsx apps/web/src/app/[...slug]/page.test.tsx
git commit -m "feat(web): auto-import recipes from slug routes"
```

### Task 3: Add route-level loading UI for the slug import flow

**Files:**
- Create: `apps/web/src/app/[...slug]/loading.tsx`
- Create: `apps/web/src/app/[...slug]/loading.test.tsx`
- Test: `apps/web/src/app/[...slug]/loading.test.tsx`

**Interfaces:**
- Consumes: default export from `apps/web/src/app/[...slug]/loading.tsx`
- Produces: `Loading(): React.ReactNode` that renders a non-interactive import-progress message for this route segment

- [ ] **Step 1: Write the failing loading UI test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Loading from "@/app/[...slug]/loading";

describe("Slug import loading UI", () => {
  it("renders an importing message for the route segment", () => {
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain("Importing recipe");
    expect(html).toContain("We&#x27;re importing this recipe now");
    expect(html).not.toContain("href=");
  });
});
```

- [ ] **Step 2: Run the loading test to verify it fails**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test -- src/app/[...slug]/loading.test.tsx`

Expected: FAIL because `apps/web/src/app/[...slug]/loading.tsx` does not exist yet.

- [ ] **Step 3: Implement the minimal loading component**

```tsx
export default function Loading() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          URL import
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Importing recipe...
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          We&apos;re importing this recipe now. This can take a few seconds.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="bg-card border-border rounded-2xl border px-4 py-6 text-sm text-muted-foreground"
      >
        Fetching recipe details and creating your saved copy.
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the loading test to verify it passes**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test -- src/app/[...slug]/loading.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run targeted verification for both slug route test files**

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test -- src/app/[...slug]/page.test.tsx src/app/[...slug]/loading.test.tsx`

Expected: PASS for both files.

- [ ] **Step 6: Commit the loading UI**

```bash
cd /Users/iandeguzman/Desktop/projects/recipe
git add apps/web/src/app/[...slug]/loading.tsx apps/web/src/app/[...slug]/loading.test.tsx
git commit -m "feat(web): add slug import loading state"
```

## Final Verification

- [ ] Run the full web test suite

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm test`

Expected: PASS.

- [ ] Run type checking

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm typecheck`

Expected: PASS.

- [ ] Run lint

Run: `cd /Users/iandeguzman/Desktop/projects/recipe/apps/web && pnpm lint`

Expected: PASS.

- [ ] Confirm the changed file set is limited to the route, its tests, and route loading UI

Run: `cd /Users/iandeguzman/Desktop/projects/recipe && git status --short`

Expected:
- `apps/web/src/app/[...slug]/page.tsx`
- `apps/web/src/app/[...slug]/page.test.tsx`
- `apps/web/src/app/[...slug]/loading.tsx`
- `apps/web/src/app/[...slug]/loading.test.tsx`
- optional plan/spec docs only if intentionally staged
