# Recipe Import Image Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store imported recipe images in Supabase Storage as WebP, persist `imageKey`, and keep imports resilient when image processing fails.

**Architecture:** Extend the recipe tables with nullable `imageKey`, add a focused storage helper that downloads/converts/uploads imported images, then wire the import pipeline to update the canonical recipe after insert and copy `imageKey` into user recipes. Public image URLs are derived from `imageKey` at render time.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Drizzle ORM, Supabase Storage HTTP API, Sharp

## Global Constraints

- Keep `imageUrl` meaning the original remote image URL.
- Add `imageKey` meaning the Supabase storage object key.
- Bucket name must be `recipe-images`.
- Imported image path format must be `imported/<importedRecipeId>.webp`.
- Public URLs must be derived from `imageKey`, not stored in the database.
- Recipe import must still succeed when image download, conversion, or upload fails.

---

### Task 1: Add failing tests for `imageKey` persistence and best-effort import behavior

**Files:**
- Modify: `apps/web/src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`
- Modify: `apps/web/src/lib/recipes/import/__tests__/imported-recipe-store.test.ts`
- Create: `apps/web/src/lib/recipes/import/__tests__/recipe-image-storage.test.ts`

**Interfaces:**
- Consumes: `importRecipeFromUrl({ url, userId }): Promise<ImportedRecipe>`
- Produces: `storeImportedRecipeImage(args): Promise<string | null>`, `getRecipeImagePublicUrl(imageKey): string | null`

- [ ] Write failing tests for `importRecipeFromUrl` to assert successful import with uploaded `imageKey` and successful import with upload failure returning `imageKey = null`.
- [ ] Write failing tests for store helpers to assert `createImportedRecipe`, `createUserRecipeFromImportedRecipe`, and `updateImportedRecipeImageKey` include `imageKey`.
- [ ] Write failing tests for public URL derivation and Supabase upload helper behavior.
- [ ] Run the targeted Vitest files and verify they fail for the expected missing-field or missing-module reasons.

### Task 2: Add schema and persistence support for `imageKey`

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts`
- Modify: `apps/web/src/lib/recipes/import/imported-recipe-store.ts`

**Interfaces:**
- Consumes: `RecipeInput`
- Produces: `updateImportedRecipeImageKey({ importedRecipeId, imageKey }): Promise<CanonicalImportedRecipe>`

- [ ] Add nullable `imageKey` columns to `importedRecipe` and `recipe`.
- [ ] Update canonical insert field mapping to initialize `imageKey` as `null`.
- [ ] Update user recipe cloning to copy `imageKey` from the canonical recipe.
- [ ] Implement `updateImportedRecipeImageKey` to persist the uploaded object key on the canonical row.
- [ ] Run the targeted persistence tests and verify they pass.

### Task 3: Implement Supabase image storage helpers

**Files:**
- Create: `apps/web/src/lib/recipes/import/recipe-image-storage.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `storeImportedRecipeImage(args: { importedRecipeId: string; imageUrl: string }): Promise<string | null>`
- Produces: `getRecipeImagePublicUrl(imageKey: string | null | undefined): string | null`

- [ ] Add `sharp` to the web app dependencies.
- [ ] Implement download logic that fetches the remote image and returns `null` on non-OK responses.
- [ ] Implement WebP conversion with Sharp.
- [ ] Implement Supabase Storage upload via HTTP using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Implement public URL derivation for the `recipe-images` bucket.
- [ ] Run the storage helper tests and verify they pass.

### Task 4: Wire image storage into the import pipeline

**Files:**
- Modify: `apps/web/src/lib/recipes/import/import-recipe-from-url.ts`

**Interfaces:**
- Consumes: `storeImportedRecipeImage`, `updateImportedRecipeImageKey`
- Produces: Imported recipe rows with optional `imageKey`

- [ ] After canonical insert, attempt image storage only when `input.imageUrl` is present.
- [ ] If storage succeeds, update the canonical row with `imageKey` and use the updated canonical record for user cloning.
- [ ] If storage fails or returns `null`, continue using the canonical row with `imageKey = null`.
- [ ] Run the targeted import-flow tests and verify they pass.

### Task 5: Verify end-to-end contract and document environment requirements

**Files:**
- Modify: `apps/web/src/app/api/recipes/import/route.test.ts`
- Create or Modify: `apps/web/.env.example`

**Interfaces:**
- Consumes: API import response objects
- Produces: documented env vars for storage integration

- [ ] Update route tests to include `imageKey` in successful import responses.
- [ ] Document `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_URL` requirements.
- [ ] Run the targeted API tests, then the full `pnpm test` and `pnpm typecheck` checks.
- [ ] Commit with a Conventional Commit message after verification.
