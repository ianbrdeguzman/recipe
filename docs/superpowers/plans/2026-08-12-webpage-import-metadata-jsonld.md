# Webpage Import Metadata + JSON-LD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual JSON-LD script extraction with a Cheerio-based page-signal parser, prioritize page metadata for title/description/image, and enrich webpage-import fallback extraction with metadata plus partial JSON-LD context.

**Architecture:** Add a focused `extract-page-signals.ts` module that loads HTML with Cheerio and returns normalized metadata plus partial recipe fields from JSON-LD. Keep `extractRecipeFromJsonLd()` as the public complete-recipe gate by assembling `RecipeInput` from those signals, then add a small fallback-content formatter so `webpageImporter` can prepend structured context before calling the LLM extractor.

**Tech Stack:** Next.js 16 app package, TypeScript, Vitest, Cheerio, Turndown, OpenAI Responses API

## Global Constraints

- Replace manual JSON-LD script extraction with Cheerio selectors.
- Parse page metadata from `<title>` and `<meta>` tags.
- Prefer metadata for title/description/image.
- Prefer JSON-LD for ingredients/instructions.
- Preserve the existing public contract that structured extraction returns `RecipeInput | null`.
- Improve LLM fallback quality by including metadata and partial JSON-LD signals.
- Do not change the external return type of `extractRecipeFromJsonLd`.
- Do not make `image` part of `RecipeInput`.
- Do not synthesize ingredients or instructions from metadata.
- Keep fallback formatting deterministic for testability.
- Use TDD: write the failing test first, verify it fails, then implement the minimum code to pass.
- Use Conventional Commits for every commit.

---

## File Structure

### New files
- `apps/web/src/lib/recipes/import/extract-page-signals.ts`
  - Owns Cheerio HTML loading, metadata extraction, JSON-LD parsing, recipe-node discovery, and normalized partial structured recipe fields.
- `apps/web/src/lib/recipes/import/format-webpage-fallback-content.ts`
  - Owns deterministic text formatting for metadata + partial structured recipe context + markdown body.
- `apps/web/src/lib/recipes/import/__tests__/extract-page-signals.test.ts`
  - Covers Cheerio selectors, metadata priority, invalid JSON-LD handling, and partial recipe extraction.
- `apps/web/src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts`
  - Covers deterministic fallback-content formatting and omission of empty sections.

### Modified files
- `apps/web/package.json`
  - Add direct `cheerio` dependency.
- `apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts`
  - Reuse `extractPageSignals()` and convert complete signals into `RecipeInput | null`.
- `apps/web/src/lib/recipes/import/importers/webpage-importer.ts`
  - Use page signals when structured extraction is incomplete and prepend formatted context before LLM extraction.
- `apps/web/src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts`
  - Cover metadata-overrides-JSON-LD assembly rules.
- `apps/web/src/lib/recipes/import/__tests__/webpage-importer.test.ts`
  - Cover enriched fallback content and preserved Jina fallback behavior.

## Interfaces

### `extract-page-signals.ts`
```ts
export type PageMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
};

export type PartialRecipeFields = {
  title: string | null;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: string[];
  instructions: string[];
};

export type PageSignals = {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
};

export function extractPageSignals({ html }: { html: string }): PageSignals;
```

### `format-webpage-fallback-content.ts`
```ts
import type { PageMetadata, PartialRecipeFields } from "./extract-page-signals";

export function formatWebpageFallbackContent(args: {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
  markdown: string;
}): string;
```

### `extract-recipe-from-json-ld.ts`
```ts
export function extractRecipeFromJsonLd(args: { html: string }): RecipeInput | null;
```

The function remains unchanged publicly and should assemble:
- `title`: `metadata.title ?? recipe.title`
- `description`: `metadata.description ?? recipe.description ?? null`
- `servings`: `recipe.servings`
- `prepTimeMinutes`: `recipe.prepTimeMinutes`
- `cookTimeMinutes`: `recipe.cookTimeMinutes`
- `ingredients`: `recipe.ingredients`
- `instructions`: `recipe.instructions`

### `webpage-importer.ts`
No signature change:
```ts
export const webpageImporter: RecipeImporter;
```

When structured extraction is incomplete, it should call:
```ts
const signals = extractPageSignals({ html });
const content = formatWebpageFallbackContent({
  metadata: signals.metadata,
  recipe: signals.recipe,
  markdown: htmlToMarkdown(html),
});
```

---

### Task 1: Add Cheerio and create page-signal extraction

**Files:**
- Create: `apps/web/src/lib/recipes/import/extract-page-signals.ts`
- Create: `apps/web/src/lib/recipes/import/__tests__/extract-page-signals.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `RecipeInput` parsing helpers already present in `extract-recipe-from-json-ld.ts` can be copied or moved as file-local utilities.
- Produces:
  - `extractPageSignals({ html }: { html: string }): PageSignals`
  - `PageMetadata`, `PartialRecipeFields`, `PageSignals`

- [ ] **Step 1: Write the failing tests for metadata priority and partial JSON-LD extraction**

```ts
import { describe, expect, it } from "vitest";

import { extractPageSignals } from "@/lib/recipes/import/extract-page-signals";

describe("extractPageSignals", () => {
  it("prefers Open Graph metadata and keeps JSON-LD ingredients/instructions", () => {
    const html = `
      <html>
        <head>
          <title>HTML Pancakes</title>
          <meta property="og:title" content="OG Pancakes" />
          <meta name="description" content="HTML description" />
          <meta property="og:description" content="OG description" />
          <meta property="og:image" content="https://cdn.example.com/pancakes.jpg" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "JSON-LD Pancakes",
              "description": "JSON-LD description",
              "recipeYield": "4 servings",
              "prepTime": "PT10M",
              "cookTime": "PT15M",
              "recipeIngredient": ["1 cup flour", "1 egg"],
              "recipeInstructions": ["Mix", "Cook"]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractPageSignals({ html })).toEqual({
      metadata: {
        title: "OG Pancakes",
        description: "OG description",
        image: "https://cdn.example.com/pancakes.jpg",
      },
      recipe: {
        title: "JSON-LD Pancakes",
        description: "JSON-LD description",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour", "1 egg"],
        instructions: ["Mix", "Cook"],
      },
    });
  });

  it("ignores malformed JSON-LD blocks and still returns metadata", () => {
    const html = `
      <meta property="og:title" content="Broken JSON-LD Page" />
      <script type="application/ld+json">{ not valid json }</script>
    `;

    expect(extractPageSignals({ html })).toEqual({
      metadata: {
        title: "Broken JSON-LD Page",
        description: null,
        image: null,
      },
      recipe: {
        title: null,
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: [],
        instructions: [],
      },
    });
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/extract-page-signals.test.ts`

Expected: FAIL with `Cannot find module '@/lib/recipes/import/extract-page-signals'` or `Cannot resolve package 'cheerio'`.

- [ ] **Step 3: Add Cheerio and implement the minimum page-signal extractor**

```bash
pnpm --filter web add cheerio
```

```ts
import { load } from "cheerio";

export type PageMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
};

export type PartialRecipeFields = {
  title: string | null;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: string[];
  instructions: string[];
};

export type PageSignals = {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
};

export function extractPageSignals({ html }: { html: string }): PageSignals {
  const $ = load(html);
  const metadata: PageMetadata = {
    title: firstNonEmpty(
      $("meta[property='og:title']").attr("content"),
      $("title").first().text(),
    ),
    description: firstNonEmpty(
      $("meta[property='og:description']").attr("content"),
      $("meta[name='description']").attr("content"),
    ),
    image: firstNonEmpty($("meta[property='og:image']").attr("content")),
  };

  const parsedBlocks = $("script[type='application/ld+json']")
    .toArray()
    .flatMap((element) => parseJsonLdBlock($(element).html()));

  const recipeNodes = parsedBlocks.flatMap((value) => collectRecipeNodes(value));
  const bestNode = recipeNodes[0];

  return {
    metadata,
    recipe: bestNode ? extractPartialRecipeFields(bestNode) : emptyRecipeFields(),
  };
}
```

Implement file-local helpers in the same file:
- `firstNonEmpty(...values: Array<string | null | undefined>): string | null`
- `parseJsonLdBlock(raw: string | null | undefined): unknown[]`
- `collectRecipeNodes(value: unknown): Record<string, unknown>[]`
- `extractPartialRecipeFields(node: Record<string, unknown>): PartialRecipeFields`
- `emptyRecipeFields(): PartialRecipeFields`
- reuse normalized text, servings, duration, ingredients, and instruction parsing logic from the current module

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/extract-page-signals.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml \
  apps/web/src/lib/recipes/import/extract-page-signals.ts \
  apps/web/src/lib/recipes/import/__tests__/extract-page-signals.test.ts
git commit -m "feat(import): add cheerio page signal extraction"
```

### Task 2: Rebuild complete structured recipe extraction on top of page signals

**Files:**
- Modify: `apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts`
- Modify: `apps/web/src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts`

**Interfaces:**
- Consumes:
  - `extractPageSignals({ html }: { html: string }): PageSignals`
- Produces:
  - `extractRecipeFromJsonLd({ html }: { html: string }): RecipeInput | null`

- [ ] **Step 1: Write the failing tests for metadata-overrides-JSON-LD assembly**

```ts
it("uses metadata title and description when JSON-LD recipe fields are otherwise complete", () => {
  const html = `
    <html>
      <head>
        <title>HTML title should lose to OG title</title>
        <meta property="og:title" content="Metadata Pancakes" />
        <meta property="og:description" content="Metadata description" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "JSON-LD Pancakes",
            "description": "JSON-LD description",
            "recipeYield": ["12 pancakes"],
            "prepTime": "PT5M",
            "cookTime": "PT20M",
            "recipeIngredient": ["2 cups flour", "1 egg"],
            "recipeInstructions": ["Mix ingredients", "Cook pancakes"]
          }
        </script>
      </head>
    </html>
  `;

  expect(extractRecipeFromJsonLd({ html })).toEqual({
    title: "Metadata Pancakes",
    description: "Metadata description",
    servings: 12,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    ingredients: ["2 cups flour", "1 egg"],
    instructions: ["Mix ingredients", "Cook pancakes"],
  });
});

it("returns null when metadata exists but JSON-LD ingredients and instructions are missing", () => {
  const html = `
    <meta property="og:title" content="Metadata Only Pancakes" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "recipeYield": "4 servings"
      }
    </script>
  `;

  expect(extractRecipeFromJsonLd({ html })).toBeNull();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts`

Expected: FAIL because the current implementation does not read metadata and still uses regex-based extraction.

- [ ] **Step 3: Implement the minimum adapter over `extractPageSignals()`**

```ts
import type { RecipeInput } from "@/lib/recipes/schema";

import { extractPageSignals } from "./extract-page-signals";

function hasCompleteRecipe(recipe: {
  title: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: string[];
  instructions: string[];
}) {
  return Boolean(
    recipe.title &&
      recipe.servings &&
      recipe.prepTimeMinutes &&
      recipe.cookTimeMinutes &&
      recipe.ingredients.length > 0 &&
      recipe.instructions.length > 0,
  );
}

export function extractRecipeFromJsonLd({ html }: { html: string }): RecipeInput | null {
  const { metadata, recipe } = extractPageSignals({ html });
  const title = metadata.title ?? recipe.title;
  const description = metadata.description ?? recipe.description ?? null;

  if (
    !hasCompleteRecipe({
      ...recipe,
      title,
    })
  ) {
    return null;
  }

  return {
    title,
    description,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}
```

Delete the old regex-based block parser from this file once the tests pass.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts \
  apps/web/src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts
git commit -m "feat(import): prioritize metadata in structured recipe extraction"
```

### Task 3: Add deterministic fallback-content formatting

**Files:**
- Create: `apps/web/src/lib/recipes/import/format-webpage-fallback-content.ts`
- Create: `apps/web/src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts`

**Interfaces:**
- Consumes:
  - `PageMetadata`
  - `PartialRecipeFields`
- Produces:
  - `formatWebpageFallbackContent(args: { metadata: PageMetadata; recipe: PartialRecipeFields; markdown: string }): string`

- [ ] **Step 1: Write the failing formatter test**

```ts
import { describe, expect, it } from "vitest";

import { formatWebpageFallbackContent } from "@/lib/recipes/import/format-webpage-fallback-content";

describe("formatWebpageFallbackContent", () => {
  it("prepends deterministic metadata and structured recipe context before markdown", () => {
    expect(
      formatWebpageFallbackContent({
        metadata: {
          title: "Metadata Pancakes",
          description: "Fluffy pancakes from metadata",
          image: "https://cdn.example.com/pancakes.jpg",
        },
        recipe: {
          title: "JSON-LD Pancakes",
          description: "JSON-LD description",
          servings: 4,
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          ingredients: ["1 cup flour", "1 egg"],
          instructions: ["Mix", "Cook"],
        },
        markdown: "# Pancakes\n\nBody copy",
      }),
    ).toBe(`Page metadata:\nTitle: Metadata Pancakes\nDescription: Fluffy pancakes from metadata\nImage: https://cdn.example.com/pancakes.jpg\n\nStructured recipe data found:\nJSON-LD title: JSON-LD Pancakes\nJSON-LD description: JSON-LD description\nServings: 4\nPrep time: 10 minutes\nCook time: 15 minutes\nIngredients:\n- 1 cup flour\n- 1 egg\nInstructions:\n- Mix\n- Cook\n\nPage content:\n# Pancakes\n\nBody copy`);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts`

Expected: FAIL with `Cannot find module '@/lib/recipes/import/format-webpage-fallback-content'`.

- [ ] **Step 3: Implement the minimum deterministic formatter**

```ts
import type { PageMetadata, PartialRecipeFields } from "./extract-page-signals";

export function formatWebpageFallbackContent({ metadata, recipe, markdown }: {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
  markdown: string;
}) {
  const lines: string[] = [];

  if (metadata.title || metadata.description || metadata.image) {
    lines.push("Page metadata:");
    if (metadata.title) lines.push(`Title: ${metadata.title}`);
    if (metadata.description) lines.push(`Description: ${metadata.description}`);
    if (metadata.image) lines.push(`Image: ${metadata.image}`);
  }

  const structuredLines = collectStructuredLines(recipe);
  if (structuredLines.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Structured recipe data found:");
    lines.push(...structuredLines);
  }

  if (markdown.trim().length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Page content:");
    lines.push(markdown.trim());
  }

  return lines.join("\n").trim();
}
```

Implement `collectStructuredLines(recipe)` in the same file so the field order is always:
1. JSON-LD title
2. JSON-LD description
3. Servings
4. Prep time
5. Cook time
6. Ingredients list
7. Instructions list

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/recipes/import/format-webpage-fallback-content.ts \
  apps/web/src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts
git commit -m "feat(import): format enriched webpage fallback content"
```

### Task 4: Wire enriched fallback content into `webpageImporter`

**Files:**
- Modify: `apps/web/src/lib/recipes/import/importers/webpage-importer.ts`
- Modify: `apps/web/src/lib/recipes/import/__tests__/webpage-importer.test.ts`

**Interfaces:**
- Consumes:
  - `extractRecipeFromJsonLd({ html }: { html: string }): RecipeInput | null`
  - `extractPageSignals({ html }: { html: string }): PageSignals`
  - `formatWebpageFallbackContent(args: { metadata: PageMetadata; recipe: PartialRecipeFields; markdown: string }): string`
  - `htmlToMarkdown(html: string): string`
- Produces:
  - existing `webpageImporter` behavior, with enriched content passed to `extractRecipe(...)` when structured extraction is incomplete

- [ ] **Step 1: Write the failing importer test for enriched fallback content**

```ts
it("prepends metadata and partial JSON-LD context before LLM fallback extraction", async () => {
  vi.mocked(fetchWebpage).mockResolvedValue({
    html: `
      <html>
        <head>
          <meta property="og:title" content="Metadata Pancakes" />
          <meta property="og:description" content="Fluffy pancakes from metadata" />
          <meta property="og:image" content="https://cdn.example.com/pancakes.jpg" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "recipeYield": "4 servings",
              "recipeIngredient": ["1 cup flour"],
              "recipeInstructions": ["Mix ingredients"]
            }
          </script>
        </head>
        <body><h1>Pancakes</h1></body>
      </html>
    `,
    sourceUrl: "https://example.com/recipe",
  });
  vi.mocked(extractRecipeFromJsonLd).mockReturnValue(null);
  vi.mocked(htmlToMarkdown).mockReturnValue("# Pancakes");
  vi.mocked(extractRecipe).mockResolvedValue({
    title: "Pancakes",
    description: null,
    servings: 4,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    ingredients: ["1 cup flour"],
    instructions: ["Mix ingredients"],
  });

  await webpageImporter({
    url: new URL("https://example.com/recipe"),
    sourceType: "webpage",
  });

  expect(extractRecipe).toHaveBeenCalledWith({
    sourceUrl: "https://example.com/recipe",
    content: `Page metadata:\nTitle: Metadata Pancakes\nDescription: Fluffy pancakes from metadata\nImage: https://cdn.example.com/pancakes.jpg\n\nStructured recipe data found:\nServings: 4\nIngredients:\n- 1 cup flour\nInstructions:\n- Mix ingredients\n\nPage content:\n# Pancakes`,
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/webpage-importer.test.ts`

Expected: FAIL because the importer still passes raw markdown only.

- [ ] **Step 3: Implement the minimum fallback-enrichment wiring**

```ts
import { extractPageSignals } from "../extract-page-signals";
import { formatWebpageFallbackContent } from "../format-webpage-fallback-content";

export const webpageImporter: RecipeImporter = async ({ url }) => {
  try {
    const { html, sourceUrl } = await fetchWebpage({ url });
    const jsonLdRecipe = extractRecipeFromJsonLd({ html });

    if (jsonLdRecipe) {
      return jsonLdRecipe;
    }

    const markdown = htmlToMarkdown(html);
    const signals = extractPageSignals({ html });
    const content = formatWebpageFallbackContent({
      metadata: signals.metadata,
      recipe: signals.recipe,
      markdown,
    });

    if (content.trim().length > 0) {
      return await extractRecipe({
        sourceUrl,
        content,
      });
    }
  } catch {
    // Fall through to Jina as a last resort.
  }

  const { content } = await fetchWithJina({ url });
  return extractRecipe({ sourceUrl: url.toString(), content });
};
```

Keep the existing success path and existing Jina fallback path unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/webpage-importer.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/recipes/import/importers/webpage-importer.ts \
  apps/web/src/lib/recipes/import/__tests__/webpage-importer.test.ts
git commit -m "feat(import): enrich webpage importer fallback context"
```

### Task 5: Final verification

**Files:**
- Modify: none expected
- Test: `apps/web/src/lib/recipes/import/__tests__/extract-page-signals.test.ts`
- Test: `apps/web/src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts`
- Test: `apps/web/src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts`
- Test: `apps/web/src/lib/recipes/import/__tests__/webpage-importer.test.ts`

**Interfaces:**
- Consumes: all earlier tasks
- Produces: verified, shippable implementation with no new failing tests or type errors in the touched area

- [ ] **Step 1: Run the focused recipe-import test suite**

Run: `pnpm --filter web exec vitest run src/lib/recipes/import/__tests__/extract-page-signals.test.ts src/lib/recipes/import/__tests__/extract-recipe-from-json-ld.test.ts src/lib/recipes/import/__tests__/format-webpage-fallback-content.test.ts src/lib/recipes/import/__tests__/webpage-importer.test.ts`

Expected: PASS

- [ ] **Step 2: Run the full web test suite**

Run: `pnpm --filter web test`

Expected: PASS

- [ ] **Step 3: Run type-checking for the web app**

Run: `pnpm --filter web typecheck`

Expected: PASS

- [ ] **Step 4: Commit the verification checkpoint if any test-only fixes were required**

```bash
git status --short
# If there are no changes, do not create an empty commit.
# If verification required code changes, commit them with:
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/recipes/import
git commit -m "test(import): finalize webpage metadata import verification"
```

## Self-Review

### Spec coverage
- Cheerio replaces regex-based JSON-LD extraction: Task 1
- Metadata parsing from head tags: Task 1
- Metadata priority for title/description/image: Tasks 1 and 2
- JSON-LD authority for ingredients/instructions: Tasks 1 and 2
- Preserve `extractRecipeFromJsonLd(): RecipeInput | null`: Task 2
- Enriched fallback content with metadata + partial JSON-LD + markdown: Tasks 3 and 4
- Preserve Jina fallback: Task 4 plus Task 5 verification

### Placeholder scan
- No `TODO`, `TBD`, or “similar to previous task” placeholders remain.
- Each task includes explicit test code, commands, and commit messages.

### Type consistency
- `extractPageSignals` always returns `PageSignals`.
- `formatWebpageFallbackContent` always receives `PageMetadata`, `PartialRecipeFields`, and `markdown`.
- `extractRecipeFromJsonLd` stays `({ html }: { html: string }) => RecipeInput | null`.
- `webpageImporter` signature remains unchanged.
