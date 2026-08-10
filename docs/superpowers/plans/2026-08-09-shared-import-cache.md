# Shared Import Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared imported-recipe cache keyed by normalized URL so upstream recipe extraction runs once per URL while each user still gets one independently editable saved recipe.

**Architecture:** Keep `recipe` as the user-owned editable table and add a new `imported_recipe` canonical cache table. Refactor the import service so it normalizes the URL, returns an existing user recipe when already saved, clones from canonical cache when available, and only calls the upstream importer on cache miss.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle ORM, Postgres, Better Auth, Zod, Vitest

## Global Constraints

- This codebase uses **Next.js 16.2.12**; read the relevant guide in `node_modules/next/dist/docs/` before writing implementation code.
- Keep `src/app/api/recipes/import/route.ts` orchestration-only.
- Deduplication is based on **exact normalized URL only**.
- Each user gets their **own editable recipe copy**.
- Each user may save **at most one recipe per normalized URL**.
- Canonical cached imported recipes are **not user-editable**.
- Do not add fuzzy deduplication, sync-back, or versioning.
- Preserve existing user-safe import failure messages.
- Use TDD for each task.
- Use Conventional Commits for every commit.

---

## Planned File Structure

### New files
- `src/lib/recipes/import/normalize-source-url.ts` — shared conservative URL normalization utility.
- `src/lib/recipes/import/imported-recipe-store.ts` — canonical cache lookup/create and user-recipe clone helpers.
- `src/lib/recipes/import/__tests__/normalize-source-url.test.ts`
- `src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

### Modified files
- `src/lib/db/schema.ts` — add `imported_recipe`, new `recipe` columns, relations, and unique constraint.
- `src/lib/recipes/import/types.ts` — add canonical imported recipe types.
- `src/lib/recipes/import/save-imported-recipe.ts` — replace direct insert helper with cache-aware persistence helpers or remove in favor of the new store module.
- `src/lib/recipes/import/import-recipe-from-url.ts` — add normalization, existing-user lookup, canonical-cache lookup, clone flow, and race handling.
- `src/lib/recipes/import/__tests__/save-imported-recipe.test.ts` — remove or rewrite if the new store module subsumes it.
- `src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts` — cover cache hit/miss and same-user idempotency.
- `src/app/api/recipes/import/route.test.ts` — assert duplicate import returns the existing saved recipe.
- `docs/architecture.md` — document the canonical cache plus user-copy model.
- `docs/implementation-tasks.md` — document that import dedupe now happens before upstream fetch.

## Shared Interfaces

These names and signatures are the contract for all tasks below.

```ts
// src/lib/recipes/import/normalize-source-url.ts
export function normalizeRecipeSourceUrl(input: string | URL): string;
```

```ts
// src/lib/recipes/import/types.ts
import type { importedRecipe, recipe } from "@/lib/db/schema";

export type ImportedRecipe = typeof recipe.$inferSelect;
export type CanonicalImportedRecipe = typeof importedRecipe.$inferSelect;
```

```ts
// src/lib/recipes/import/imported-recipe-store.ts
import type { RecipeInput } from "@/lib/recipes/schema";
import type { CanonicalImportedRecipe, ImportedRecipe } from "./types";

export async function findUserRecipeByNormalizedUrl(args: {
  userId: string;
  normalizedSourceUrl: string;
}): Promise<ImportedRecipe | null>;

export async function findImportedRecipeByNormalizedUrl(args: {
  normalizedSourceUrl: string;
}): Promise<CanonicalImportedRecipe | null>;

export async function createImportedRecipe(args: {
  normalizedSourceUrl: string;
  originalSourceUrl: string;
  input: RecipeInput;
}): Promise<CanonicalImportedRecipe>;

export async function createUserRecipeFromImportedRecipe(args: {
  userId: string;
  normalizedSourceUrl: string;
  canonicalRecipe: CanonicalImportedRecipe;
}): Promise<ImportedRecipe>;
```

```ts
// src/lib/recipes/import/import-recipe-from-url.ts
import type { ImportedRecipe } from "./types";

export async function importRecipeFromUrl(args: {
  url: string;
  userId: string;
}): Promise<ImportedRecipe>;
```

---

### Task 1: Add URL normalization and database schema support for cached imports

**Files:**
- Create: `src/lib/recipes/import/normalize-source-url.ts`
- Create: `src/lib/recipes/import/__tests__/normalize-source-url.test.ts`
- Modify: `src/lib/db/schema.ts`
- Test: `src/lib/recipes/import/__tests__/normalize-source-url.test.ts`

**Interfaces:**
- Consumes: existing `recipe` table definitions
- Produces:
  - `normalizeRecipeSourceUrl(input: string | URL): string`
  - `importedRecipe` table
  - `recipe.normalizedSourceUrl`
  - `recipe.importedRecipeId`
  - unique per-user normalized URL constraint

- [ ] **Step 1: Write the failing normalization test**

```ts
// src/lib/recipes/import/__tests__/normalize-source-url.test.ts
import { describe, expect, it } from "vitest";

import { normalizeRecipeSourceUrl } from "@/lib/recipes/import/normalize-source-url";

describe("normalizeRecipeSourceUrl", () => {
  it("lowercases host, strips default port, and trims a trailing slash", () => {
    expect(
      normalizeRecipeSourceUrl(
        "https://WWW.Example.com:443/recipe/pancakes/?utm_source=ignored",
      ),
    ).toBe("https://www.example.com/recipe/pancakes?utm_source=ignored");
  });

  it("preserves query string and non-default port", () => {
    expect(
      normalizeRecipeSourceUrl(
        "http://example.com:8080/recipe?id=42",
      ),
    ).toBe("http://example.com:8080/recipe?id=42");
  });
});
```

- [ ] **Step 2: Run the test to verify the normalizer does not exist yet**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/normalize-source-url.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Add the normalizer and schema changes**

```ts
// src/lib/recipes/import/normalize-source-url.ts
export function normalizeRecipeSourceUrl(input: string | URL): string {
  const url = typeof input === "string" ? new URL(input) : new URL(input.toString());

  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
```

```ts
// src/lib/db/schema.ts
import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const importedRecipe = pgTable(
  "imported_recipe",
  {
    id: text("id").primaryKey(),
    normalizedSourceUrl: text("normalized_source_url").notNull().unique(),
    originalSourceUrl: text("original_source_url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    ingredients: jsonb("ingredients").$type<string[]>().notNull(),
    instructions: jsonb("instructions").$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("imported_recipe_normalized_source_url_idx").on(table.normalizedSourceUrl)],
);

export const recipe = pgTable(
  "recipe",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    importedRecipeId: text("imported_recipe_id").references(() => importedRecipe.id, {
      onDelete: "set null",
    }),
    normalizedSourceUrl: text("normalized_source_url"),
    sourceType: recipeSourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    title: text("title").notNull(),
    description: text("description"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    ingredients: jsonb("ingredients").$type<string[]>().notNull(),
    instructions: jsonb("instructions").$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("recipe_user_normalized_source_url_unique")
      .on(table.userId, table.normalizedSourceUrl)
      .where(sql`${table.normalizedSourceUrl} is not null`),
  ],
);
```

Also update relations and schema export:

```ts
export const importedRecipeRelations = relations(importedRecipe, ({ many }) => ({
  recipes: many(recipe),
}));

export const recipeRelations = relations(recipe, ({ one }) => ({
  user: one(user, {
    fields: [recipe.userId],
    references: [user.id],
  }),
  importedRecipe: one(importedRecipe, {
    fields: [recipe.importedRecipeId],
    references: [importedRecipe.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  recipe,
  importedRecipe,
};
```

- [ ] **Step 4: Run the normalization test and do a schema typecheck smoke check**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/normalize-source-url.test.ts`

Run: `pnpm exec tsc --noEmit`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/normalize-source-url.ts src/lib/recipes/import/__tests__/normalize-source-url.test.ts src/lib/db/schema.ts
git commit -m "feat(import): add normalized import cache schema"
```

### Task 2: Add canonical-cache and user-clone persistence helpers

**Files:**
- Create: `src/lib/recipes/import/imported-recipe-store.ts`
- Create: `src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`
- Modify: `src/lib/recipes/import/types.ts`
- Modify: `src/lib/recipes/import/save-imported-recipe.ts`
- Test: `src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

**Interfaces:**
- Consumes: `db`, `recipe`, `importedRecipe`, `RecipeInput`, `RecipePersistenceError`
- Produces:
  - `findUserRecipeByNormalizedUrl(...)`
  - `findImportedRecipeByNormalizedUrl(...)`
  - `createImportedRecipe(...)`
  - `createUserRecipeFromImportedRecipe(...)`
  - `CanonicalImportedRecipe`

- [ ] **Step 1: Write the failing store tests**

```ts
// src/lib/recipes/import/__tests__/imported-recipe-store.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "@/lib/recipes/import/imported-recipe-store";

describe("findUserRecipeByNormalizedUrl", () => {
  it("returns the first matching user recipe", async () => {
    const where = vi.fn().mockResolvedValue([{ id: "recipe-1", title: "Pancakes" }]);
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({ from } as never);

    const result = await findUserRecipeByNormalizedUrl({
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
    });

    expect(result).toMatchObject({ id: "recipe-1" });
  });
});

describe("findImportedRecipeByNormalizedUrl", () => {
  it("returns the canonical cached recipe for the normalized URL", async () => {
    const where = vi.fn().mockResolvedValue([{ id: "imported-1", title: "Pancakes" }]);
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({ from } as never);

    const result = await findImportedRecipeByNormalizedUrl({
      normalizedSourceUrl: "https://example.com/recipe",
    });

    expect(result).toMatchObject({ id: "imported-1" });
  });
});

describe("createImportedRecipe", () => {
  it("stores a canonical cached row", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "imported-1", normalizedSourceUrl: "https://example.com/recipe" }]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    const result = await createImportedRecipe({
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://EXAMPLE.com/recipe/",
      input: {
        title: "Pancakes",
        description: null,
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    });

    expect(result.normalizedSourceUrl).toBe("https://example.com/recipe");
  });
});

describe("createUserRecipeFromImportedRecipe", () => {
  it("clones the canonical recipe into a user-owned recipe row", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: "recipe-1",
        userId: "user-1",
        importedRecipeId: "imported-1",
        normalizedSourceUrl: "https://example.com/recipe",
        sourceType: "url",
        sourceUrl: "https://example.com/recipe",
        title: "Pancakes",
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    const result = await createUserRecipeFromImportedRecipe({
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
      canonicalRecipe: {
        id: "imported-1",
        normalizedSourceUrl: "https://example.com/recipe",
        originalSourceUrl: "https://EXAMPLE.com/recipe/",
        title: "Pancakes",
        description: null,
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(result.importedRecipeId).toBe("imported-1");
    expect(result.sourceUrl).toBe("https://example.com/recipe");
  });
});
```

- [ ] **Step 2: Run the store tests to capture missing helpers**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

Expected: FAIL with module not found or missing exports.

- [ ] **Step 3: Implement the minimal store module and type updates**

```ts
// src/lib/recipes/import/types.ts
import type { importedRecipe, recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";

export type ImportedRecipe = typeof recipe.$inferSelect;
export type CanonicalImportedRecipe = typeof importedRecipe.$inferSelect;

export type RecipeImporter = (args: {
  url: URL;
  sourceType: ImportSourceType;
}) => Promise<RecipeInput>;
```

```ts
// src/lib/recipes/import/imported-recipe-store.ts
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { importedRecipe, recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

import { RecipePersistenceError } from "./errors";
import type { CanonicalImportedRecipe, ImportedRecipe } from "./types";

function toRecipeFields(input: RecipeInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    servings: input.servings ?? null,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    cookTimeMinutes: input.cookTimeMinutes ?? null,
    ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
    instructions: input.instructions.map((instruction) => instruction.trim()),
  };
}

export async function findUserRecipeByNormalizedUrl({
  userId,
  normalizedSourceUrl,
}: {
  userId: string;
  normalizedSourceUrl: string;
}): Promise<ImportedRecipe | null> {
  const [existingRecipe] = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.userId, userId), eq(recipe.normalizedSourceUrl, normalizedSourceUrl)));

  return existingRecipe ?? null;
}

export async function findImportedRecipeByNormalizedUrl({
  normalizedSourceUrl,
}: {
  normalizedSourceUrl: string;
}): Promise<CanonicalImportedRecipe | null> {
  const [existingImportedRecipe] = await db
    .select()
    .from(importedRecipe)
    .where(eq(importedRecipe.normalizedSourceUrl, normalizedSourceUrl));

  return existingImportedRecipe ?? null;
}

export async function createImportedRecipe({
  normalizedSourceUrl,
  originalSourceUrl,
  input,
}: {
  normalizedSourceUrl: string;
  originalSourceUrl: string;
  input: RecipeInput;
}): Promise<CanonicalImportedRecipe> {
  try {
    const [createdImportedRecipe] = await db
      .insert(importedRecipe)
      .values({
        id: crypto.randomUUID(),
        normalizedSourceUrl,
        originalSourceUrl,
        ...toRecipeFields(input),
      })
      .returning();

    return createdImportedRecipe;
  } catch (error) {
    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "Imported recipe insert failed",
    );
  }
}

export async function createUserRecipeFromImportedRecipe({
  userId,
  normalizedSourceUrl,
  canonicalRecipe,
}: {
  userId: string;
  normalizedSourceUrl: string;
  canonicalRecipe: CanonicalImportedRecipe;
}): Promise<ImportedRecipe> {
  try {
    const [createdRecipe] = await db
      .insert(recipe)
      .values({
        id: crypto.randomUUID(),
        userId,
        importedRecipeId: canonicalRecipe.id,
        normalizedSourceUrl,
        sourceType: "url",
        sourceUrl: normalizedSourceUrl,
        title: canonicalRecipe.title,
        description: canonicalRecipe.description,
        servings: canonicalRecipe.servings,
        prepTimeMinutes: canonicalRecipe.prepTimeMinutes,
        cookTimeMinutes: canonicalRecipe.cookTimeMinutes,
        ingredients: canonicalRecipe.ingredients,
        instructions: canonicalRecipe.instructions,
      })
      .returning();

    return createdRecipe;
  } catch (error) {
    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "User recipe insert failed",
    );
  }
}
```

Stub `src/lib/recipes/import/save-imported-recipe.ts` as a re-export during transition so imports do not break:

```ts
export {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "./imported-recipe-store";
```

- [ ] **Step 4: Run the store tests and the existing import persistence tests**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/save-imported-recipe.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/imported-recipe-store.ts src/lib/recipes/import/__tests__/imported-recipe-store.test.ts src/lib/recipes/import/types.ts src/lib/recipes/import/save-imported-recipe.ts
git commit -m "feat(import): add imported recipe cache store"
```

### Task 3: Refactor import orchestration to use existing-user and canonical-cache lookups

**Files:**
- Modify: `src/lib/recipes/import/import-recipe-from-url.ts`
- Modify: `src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`
- Modify: `src/app/api/recipes/import/route.test.ts`
- Test: `src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`
- Test: `src/app/api/recipes/import/route.test.ts`

**Interfaces:**
- Consumes: `normalizeRecipeSourceUrl`, `findUserRecipeByNormalizedUrl`, `findImportedRecipeByNormalizedUrl`, `createImportedRecipe`, `createUserRecipeFromImportedRecipe`, `detectImportSourceType`, `getRecipeImporter`, `webpageImporter`
- Produces:
  - same-user duplicate import returns existing recipe
  - cross-user duplicate import clones from canonical cache
  - cache miss performs upstream import once and stores canonical + user rows

- [ ] **Step 1: Replace the orchestration test with cache-aware cases**

```ts
// src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/imported-recipe-store", () => ({
  findUserRecipeByNormalizedUrl: vi.fn(),
  findImportedRecipeByNormalizedUrl: vi.fn(),
  createImportedRecipe: vi.fn(),
  createUserRecipeFromImportedRecipe: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importer-registry", () => ({
  getRecipeImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importers/webpage-importer", () => ({
  webpageImporter: vi.fn(),
}));

import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "@/lib/recipes/import/imported-recipe-store";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";

describe("importRecipeFromUrl", () => {
  it("returns an existing user recipe when the normalized URL is already saved", async () => {
    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      normalizedSourceUrl: "https://example.com/recipe",
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
      importedRecipeId: "imported-1",
    } as never);

    const result = await importRecipeFromUrl({
      url: "https://EXAMPLE.com/recipe/",
      userId: "user-1",
    });

    expect(result.id).toBe("recipe-1");
    expect(findImportedRecipeByNormalizedUrl).not.toHaveBeenCalled();
    expect(getRecipeImporter).not.toHaveBeenCalled();
  });

  it("clones from canonical cache when another user already imported the normalized URL", async () => {
    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(findImportedRecipeByNormalizedUrl).mockResolvedValue({
      id: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://EXAMPLE.com/recipe/",
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
    vi.mocked(createUserRecipeFromImportedRecipe).mockResolvedValue({
      id: "recipe-2",
      userId: "user-2",
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

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe/",
      userId: "user-2",
    });

    expect(result.id).toBe("recipe-2");
    expect(getRecipeImporter).not.toHaveBeenCalled();
  });

  it("imports upstream on canonical cache miss, then stores canonical and user rows", async () => {
    const importer = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    vi.mocked(findUserRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(findImportedRecipeByNormalizedUrl).mockResolvedValue(null);
    vi.mocked(getRecipeImporter).mockReturnValue(importer);
    vi.mocked(createImportedRecipe).mockResolvedValue({
      id: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://example.com/recipe/",
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
    vi.mocked(createUserRecipeFromImportedRecipe).mockResolvedValue({
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

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe/",
      userId: "user-1",
    });

    expect(importer).toHaveBeenCalledOnce();
    expect(createImportedRecipe).toHaveBeenCalledWith({
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://example.com/recipe/",
      input: expect.objectContaining({ title: "Pancakes" }),
    });
    expect(result.id).toBe("recipe-1");
  });
});
```

- [ ] **Step 2: Run the orchestration test to capture the now-missing behavior**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`

Expected: FAIL because the service still directly saves imported recipes.

- [ ] **Step 3: Implement the cache-aware import orchestration**

```ts
// src/lib/recipes/import/import-recipe-from-url.ts
import { getRecipeImporter } from "./importer-registry";
import {
  createImportedRecipe,
  createUserRecipeFromImportedRecipe,
  findImportedRecipeByNormalizedUrl,
  findUserRecipeByNormalizedUrl,
} from "./imported-recipe-store";
import { webpageImporter } from "./importers/webpage-importer";
import { normalizeRecipeSourceUrl } from "./normalize-source-url";
import { detectImportSourceType } from "./source-type";

export async function importRecipeFromUrl({
  url,
  userId,
}: {
  url: string;
  userId: string;
}) {
  const parsedUrl = new URL(url);
  const normalizedSourceUrl = normalizeRecipeSourceUrl(parsedUrl);

  const existingUserRecipe = await findUserRecipeByNormalizedUrl({
    userId,
    normalizedSourceUrl,
  });

  if (existingUserRecipe) {
    return existingUserRecipe;
  }

  const existingImportedRecipe = await findImportedRecipeByNormalizedUrl({
    normalizedSourceUrl,
  });

  if (existingImportedRecipe) {
    return createUserRecipeFromImportedRecipe({
      userId,
      normalizedSourceUrl,
      canonicalRecipe: existingImportedRecipe,
    });
  }

  const sourceType = detectImportSourceType(parsedUrl);
  const importer = getRecipeImporter({ sourceType, webpageImporter });
  const input = await importer({ url: parsedUrl, sourceType });
  const canonicalRecipe = await createImportedRecipe({
    normalizedSourceUrl,
    originalSourceUrl: parsedUrl.toString(),
    input,
  });

  return createUserRecipeFromImportedRecipe({
    userId,
    normalizedSourceUrl,
    canonicalRecipe,
  });
}
```

Also update the route test with a duplicate-user case:

```ts
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
```

- [ ] **Step 4: Run the focused tests and the whole import suite**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts src/app/api/recipes/import/route.test.ts`

Run: `pnpm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/import-recipe-from-url.ts src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts src/app/api/recipes/import/route.test.ts
git commit -m "feat(import): reuse cached imports across users"
```

### Task 4: Add uniqueness-race handling and document the shipped behavior

**Files:**
- Modify: `src/lib/recipes/import/imported-recipe-store.ts`
- Modify: `src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/implementation-tasks.md`
- Test: `src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

**Interfaces:**
- Consumes: user-level unique `(user_id, normalized_source_url)` constraint
- Produces: graceful same-user duplicate handling under concurrent imports

- [ ] **Step 1: Add a failing race-handling test**

```ts
// append to src/lib/recipes/import/__tests__/imported-recipe-store.test.ts
import { RecipePersistenceError } from "@/lib/recipes/import/errors";

it("re-queries and returns the existing user recipe when insert loses the uniqueness race", async () => {
  const existingRecipe = {
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
  };

  const duplicateError = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
  });

  const returning = vi.fn().mockRejectedValue(duplicateError);
  const values = vi.fn().mockReturnValue({ returning });
  const where = vi.fn().mockResolvedValue([existingRecipe]);
  const from = vi.fn().mockReturnValue({ where });

  vi.mocked(db.insert).mockReturnValue({ values } as never);
  vi.mocked(db.select).mockReturnValue({ from } as never);

  const result = await createUserRecipeFromImportedRecipe({
    userId: "user-1",
    normalizedSourceUrl: "https://example.com/recipe",
    canonicalRecipe: {
      id: "imported-1",
      normalizedSourceUrl: "https://example.com/recipe",
      originalSourceUrl: "https://example.com/recipe/",
      title: "Pancakes",
      description: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  expect(result).toMatchObject({ id: "recipe-1" });
});
```

- [ ] **Step 2: Run the store test to verify the race path is not implemented yet**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

Expected: FAIL with `RecipePersistenceError` thrown.

- [ ] **Step 3: Add uniqueness-race recovery and update docs**

```ts
// add inside src/lib/recipes/import/imported-recipe-store.ts
function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function createUserRecipeFromImportedRecipe(/* existing signature */) {
  try {
    const [createdRecipe] = await db
      .insert(recipe)
      .values({
        id: crypto.randomUUID(),
        userId,
        importedRecipeId: canonicalRecipe.id,
        normalizedSourceUrl,
        sourceType: "url",
        sourceUrl: normalizedSourceUrl,
        title: canonicalRecipe.title,
        description: canonicalRecipe.description,
        servings: canonicalRecipe.servings,
        prepTimeMinutes: canonicalRecipe.prepTimeMinutes,
        cookTimeMinutes: canonicalRecipe.cookTimeMinutes,
        ingredients: canonicalRecipe.ingredients,
        instructions: canonicalRecipe.instructions,
      })
      .returning();

    return createdRecipe;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingRecipe = await findUserRecipeByNormalizedUrl({
        userId,
        normalizedSourceUrl,
      });

      if (existingRecipe) {
        return existingRecipe;
      }
    }

    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "User recipe insert failed",
    );
  }
}
```

Update docs with bullets like:

```md
# docs/architecture.md
- Imported recipe URLs now normalize before lookup and persistence.
- `imported_recipe` stores the canonical extracted payload keyed by normalized URL.
- `recipe` stores one editable per-user copy per normalized URL.
```

```md
# docs/implementation-tasks.md
- `POST /api/recipes/import` now returns an existing user recipe when that normalized URL is already saved.
- A canonical cached import is reused across users before any upstream Jina/OpenAI request is made.
```

- [ ] **Step 4: Run verification commands**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`

Run: `pnpm test`

Run: `pnpm lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/imported-recipe-store.ts src/lib/recipes/import/__tests__/imported-recipe-store.test.ts docs/architecture.md docs/implementation-tasks.md
git commit -m "docs(import): record shared import cache flow"
```

## Self-Review

### Spec coverage
- Shared canonical cache keyed by normalized URL: Tasks 1 and 2.
- User-owned editable copies: Tasks 2 and 3.
- Same-user idempotency: Task 3.
- Cross-user cache reuse: Task 3.
- One saved copy per user per normalized URL: Task 1 constraint + Task 4 race handling.
- Conservative URL normalization: Task 1.
- Keep route orchestration-only: Task 3.
- Docs updates: Task 4.

### Placeholder scan
- No `TODO`, `TBD`, or deferred implementation placeholders remain.
- Every task includes explicit files, commands, and code snippets.

### Type consistency
- `ImportedRecipe` always refers to the user-owned `recipe` row.
- `CanonicalImportedRecipe` always refers to the new `imported_recipe` row.
- `importRecipeFromUrl({ url, userId })` remains the route-facing entry point.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-shared-import-cache.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
