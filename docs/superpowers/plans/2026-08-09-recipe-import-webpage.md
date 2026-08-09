# Recipe Import Webpage Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready `POST /api/recipes/import` pipeline that imports recipes from normal webpage URLs through Jina Reader, extracts structured recipe data with AI, validates it, saves it for the authenticated user, and returns the created recipe.

**Architecture:** Keep `src/app/api/recipes/import/route.ts` as a thin route handler. Move source detection, importer dispatch, Jina fetching, AI extraction, error mapping, and persistence into focused modules under `src/lib/recipes/import`. Use a provider registry now with only the webpage provider implemented so future Instagram/YouTube/TikTok importers can be added without changing the route contract.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Zod, Drizzle ORM, Better Auth, Vitest, OpenAI SDK, native `fetch`, Jina Reader

## Global Constraints

- This codebase uses **Next.js 16.2.12**; read the relevant guide in `node_modules/next/dist/docs/` before writing implementation code.
- Keep `src/app/api/recipes/import/route.ts` orchestration-only: auth, body parsing, service call, response mapping.
- Phase 1 supports **webpage imports only**.
- Use **Jina Reader as the primary content ingestion path**.
- Save immediately on successful extraction; no preview flow.
- Reject unsupported source types (`instagram`, `youtube`, `tiktok`) with a controlled error.
- Validate all extracted recipe data against the existing recipe schema before saving.
- Preserve `sourceUrl` on the saved recipe and set `sourceType` to `url`.
- Keep failure messages user-safe: `Could not fetch recipe URL`, `Could not extract recipe automatically`, `This URL type is not supported yet`, `Please try manual entry instead`.
- Use TDD for each task.
- Use Conventional Commits for every commit.

## Planned File Structure

### New files
- `vitest.config.ts` — Vitest config with TS path alias support and Node test environment.
- `src/lib/recipes/import/types.ts` — shared import-facing types and interfaces.
- `src/lib/recipes/import/errors.ts` — typed import errors and HTTP/error-body mapping.
- `src/lib/recipes/import/source-type.ts` — URL classification for webpage/social providers.
- `src/lib/recipes/import/importer-registry.ts` — source-type to importer dispatch.
- `src/lib/recipes/import/fetch-with-jina.ts` — Jina Reader URL builder, fetcher, and content guards.
- `src/lib/recipes/import/extraction-schema.ts` — strict schema for AI extraction output.
- `src/lib/recipes/import/extract-recipe.ts` — OpenAI-backed recipe extraction service.
- `src/lib/recipes/import/importers/webpage-importer.ts` — webpage importer that fetches via Jina and calls the extractor.
- `src/lib/recipes/import/save-imported-recipe.ts` — Drizzle persistence for imported recipes.
- `src/lib/recipes/import/import-recipe-from-url.ts` — orchestration service used by the route.
- `src/lib/recipes/import/__tests__/source-type.test.ts`
- `src/lib/recipes/import/__tests__/errors.test.ts`
- `src/lib/recipes/import/__tests__/fetch-with-jina.test.ts`
- `src/lib/recipes/import/__tests__/extract-recipe.test.ts`
- `src/lib/recipes/import/__tests__/webpage-importer.test.ts`
- `src/lib/recipes/import/__tests__/save-imported-recipe.test.ts`
- `src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`
- `src/app/api/recipes/import/route.test.ts`

### Modified files
- `package.json` — add test and import-related dependencies/scripts.
- `src/app/api/recipes/import/route.ts` — replace placeholder logic with service orchestration.
- `docs/architecture.md` — align architecture notes with the Jina-first webpage importer.
- `docs/implementation-tasks.md` — mark the import endpoint work items as implemented or superseded.

## Shared Interfaces

These names and signatures are the contract for all tasks below.

```ts
// src/lib/recipes/import/types.ts
import type { RecipeInput } from "@/lib/recipes/schema";
import type { recipe } from "@/lib/db/schema";

export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";

export type ImportedRecipe = typeof recipe.$inferSelect;

export type RecipeImporter = (args: {
  url: URL;
  sourceType: ImportSourceType;
}) => Promise<RecipeInput>;
```

```ts
// src/lib/recipes/import/source-type.ts
export function detectImportSourceType(url: URL): ImportSourceType;
```

```ts
// src/lib/recipes/import/importer-registry.ts
export function getRecipeImporter(args: {
  sourceType: ImportSourceType;
  webpageImporter: RecipeImporter;
}): RecipeImporter;
```

```ts
// src/lib/recipes/import/fetch-with-jina.ts
export async function fetchWithJina(args: {
  url: URL;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxChars?: number;
}): Promise<{
  readerUrl: string;
  content: string;
}>;
```

```ts
// src/lib/recipes/import/extract-recipe.ts
import type { RecipeInput } from "@/lib/recipes/schema";

export async function extractRecipe(args: {
  sourceUrl: string;
  content: string;
  apiKey?: string;
  model?: string;
}): Promise<RecipeInput>;
```

```ts
// src/lib/recipes/import/save-imported-recipe.ts
import type { RecipeInput } from "@/lib/recipes/schema";
import type { ImportedRecipe } from "./types";

export async function saveImportedRecipe(args: {
  input: RecipeInput;
  userId: string;
  sourceUrl: string;
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

### Task 1: Add the test harness and dependency plumbing for import work

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Test: `src/lib/recipes/import/__tests__/source-type.test.ts`

**Interfaces:**
- Consumes: existing TS path alias `@/*` from `tsconfig.json`
- Produces: `pnpm test`, `pnpm exec vitest run <file>`, Vitest globals import support in test files

- [ ] **Step 1: Add failing smoke test for the new test runner**

```ts
// src/lib/recipes/import/__tests__/source-type.test.ts
import { describe, expect, it } from "vitest";

import { detectImportSourceType } from "@/lib/recipes/import/source-type";

describe("detectImportSourceType", () => {
  it("classifies a normal recipe website as webpage", () => {
    expect(
      detectImportSourceType(
        new URL(
          "https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/",
        ),
      ),
    ).toBe("webpage");
  });
});
```

- [ ] **Step 2: Run the test to verify the repo has no test harness yet**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/source-type.test.ts`

Expected: command fails because `vitest` is not installed or configured.

- [ ] **Step 3: Add the minimal test tooling**

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.0.0"
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```ts
// src/lib/recipes/import/source-type.ts
import type { ImportSourceType } from "./types";

export function detectImportSourceType(_url: URL): ImportSourceType {
  return "webpage";
}
```

```ts
// src/lib/recipes/import/types.ts
export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";
```

- [ ] **Step 4: Install and run the smoke test until it passes**

Run: `pnpm install`

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/source-type.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/lib/recipes/import/types.ts src/lib/recipes/import/source-type.ts src/lib/recipes/import/__tests__/source-type.test.ts
git commit -m "test(import): add vitest harness for import modules"
```

### Task 2: Implement source detection, registry dispatch, and typed import errors

**Files:**
- Create: `src/lib/recipes/import/errors.ts`
- Create: `src/lib/recipes/import/importer-registry.ts`
- Modify: `src/lib/recipes/import/source-type.ts`
- Modify: `src/lib/recipes/import/types.ts`
- Test: `src/lib/recipes/import/__tests__/source-type.test.ts`
- Test: `src/lib/recipes/import/__tests__/errors.test.ts`

**Interfaces:**
- Consumes: `ImportSourceType`, `RecipeImporter`
- Produces:
  - `detectImportSourceType(url: URL): ImportSourceType`
  - `getRecipeImporter({ sourceType, webpageImporter }): RecipeImporter`
  - `class ImportError extends Error`
  - `class UnsupportedImportSourceError extends ImportError`
  - `class UpstreamFetchError extends ImportError`
  - `class RecipeExtractionError extends ImportError`
  - `class RecipeValidationError extends ImportError`
  - `class RecipePersistenceError extends ImportError`
  - `export function toImportErrorResponse(error: unknown): Response`

- [ ] **Step 1: Write failing tests for host classification, unsupported routing, and error mapping**

```ts
// src/lib/recipes/import/__tests__/source-type.test.ts
import { describe, expect, it, vi } from "vitest";

import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import { detectImportSourceType } from "@/lib/recipes/import/source-type";
import { UnsupportedImportSourceError } from "@/lib/recipes/import/errors";

describe("detectImportSourceType", () => {
  it.each([
    ["https://www.instagram.com/reel/abc", "instagram"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://www.tiktok.com/@cook/video/123", "tiktok"],
    ["https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/", "webpage"],
  ])("maps %s to %s", (value, expected) => {
    expect(detectImportSourceType(new URL(value))).toBe(expected);
  });
});

describe("getRecipeImporter", () => {
  it("returns the webpage importer for webpage URLs", async () => {
    const webpageImporter = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix"],
    });

    const importer = getRecipeImporter({ sourceType: "webpage", webpageImporter });
    await importer({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(webpageImporter).toHaveBeenCalledOnce();
  });

  it("throws for unsupported future platform URLs", () => {
    const webpageImporter = vi.fn();

    expect(() =>
      getRecipeImporter({ sourceType: "instagram", webpageImporter }),
    ).toThrow(UnsupportedImportSourceError);
  });
});
```

```ts
// src/lib/recipes/import/__tests__/errors.test.ts
import { describe, expect, it } from "vitest";

import {
  UnsupportedImportSourceError,
  UpstreamFetchError,
  toImportErrorResponse,
} from "@/lib/recipes/import/errors";

describe("toImportErrorResponse", () => {
  it("maps unsupported sources to 422", async () => {
    const response = toImportErrorResponse(
      new UnsupportedImportSourceError("instagram"),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "This URL type is not supported yet",
    });
  });

  it("maps Jina fetch failures to 424", async () => {
    const response = toImportErrorResponse(
      new UpstreamFetchError("Reader timeout"),
    );

    expect(response.status).toBe(424);
    await expect(response.json()).resolves.toEqual({
      error: "Could not fetch recipe URL",
    });
  });
});
```

- [ ] **Step 2: Run the tests to capture the missing interfaces**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/source-type.test.ts src/lib/recipes/import/__tests__/errors.test.ts`

Expected: FAIL with missing module or export errors.

- [ ] **Step 3: Implement the minimal source, registry, and error modules**

```ts
// src/lib/recipes/import/types.ts
import type { RecipeInput } from "@/lib/recipes/schema";
import type { recipe } from "@/lib/db/schema";

export type ImportSourceType =
  | "webpage"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "unsupported";

export type ImportedRecipe = typeof recipe.$inferSelect;

export type RecipeImporter = (args: {
  url: URL;
  sourceType: ImportSourceType;
}) => Promise<RecipeInput>;
```

```ts
// src/lib/recipes/import/source-type.ts
import type { ImportSourceType } from "./types";

export function detectImportSourceType(url: URL): ImportSourceType {
  const host = url.hostname.toLowerCase();

  if (host === "instagram.com" || host === "www.instagram.com") {
    return "instagram";
  }

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "youtu.be"
  ) {
    return "youtube";
  }

  if (host === "tiktok.com" || host === "www.tiktok.com") {
    return "tiktok";
  }

  return "webpage";
}
```

```ts
// src/lib/recipes/import/errors.ts
export class ImportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly userMessage: string,
  ) {
    super(message);
  }
}

export class UnsupportedImportSourceError extends ImportError {
  constructor(sourceType: string) {
    super(`Unsupported import source: ${sourceType}`, 422, "This URL type is not supported yet");
  }
}

export class UpstreamFetchError extends ImportError {
  constructor(message: string) {
    super(message, 424, "Could not fetch recipe URL");
  }
}

export class RecipeExtractionError extends ImportError {
  constructor(message: string) {
    super(message, 502, "Could not extract recipe automatically");
  }
}

export class RecipeValidationError extends ImportError {
  constructor(message: string) {
    super(message, 502, "Could not extract recipe automatically");
  }
}

export class RecipePersistenceError extends ImportError {
  constructor(message: string) {
    super(message, 500, "Please try manual entry instead");
  }
}

export function toImportErrorResponse(error: unknown): Response {
  if (error instanceof ImportError) {
    return Response.json({ error: error.userMessage }, { status: error.status });
  }

  return Response.json({ error: "Please try manual entry instead" }, { status: 500 });
}
```

```ts
// src/lib/recipes/import/importer-registry.ts
import { UnsupportedImportSourceError } from "./errors";
import type { ImportSourceType, RecipeImporter } from "./types";

export function getRecipeImporter(args: {
  sourceType: ImportSourceType;
  webpageImporter: RecipeImporter;
}): RecipeImporter {
  if (args.sourceType === "webpage") {
    return args.webpageImporter;
  }

  throw new UnsupportedImportSourceError(args.sourceType);
}
```

- [ ] **Step 4: Run the focused tests until they pass**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/source-type.test.ts src/lib/recipes/import/__tests__/errors.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/types.ts src/lib/recipes/import/source-type.ts src/lib/recipes/import/errors.ts src/lib/recipes/import/importer-registry.ts src/lib/recipes/import/__tests__/source-type.test.ts src/lib/recipes/import/__tests__/errors.test.ts
git commit -m "feat(import): add source detection and typed import errors"
```

### Task 3: Implement Jina Reader fetching with content sanity checks

**Files:**
- Create: `src/lib/recipes/import/fetch-with-jina.ts`
- Test: `src/lib/recipes/import/__tests__/fetch-with-jina.test.ts`

**Interfaces:**
- Consumes: `UpstreamFetchError`
- Produces: `fetchWithJina({ url, fetchImpl?, timeoutMs?, maxChars? }): Promise<{ readerUrl: string; content: string }>`

- [ ] **Step 1: Write failing tests for URL construction, bad upstream responses, and empty content**

```ts
// src/lib/recipes/import/__tests__/fetch-with-jina.test.ts
import { describe, expect, it, vi } from "vitest";

import { UpstreamFetchError } from "@/lib/recipes/import/errors";
import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";

describe("fetchWithJina", () => {
  it("calls the Jina reader endpoint for the source URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Title\n\nIngredients\n- flour\n\nInstructions\n- mix", {
        status: 200,
      }),
    );

    const result = await fetchWithJina({
      url: new URL("https://example.com/recipe"),
      fetchImpl,
      timeoutMs: 1000,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://r.jina.ai/http://example.com/recipe",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.content).toContain("Ingredients");
  });

  it("throws UpstreamFetchError for non-OK responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("blocked", { status: 403 }));

    await expect(
      fetchWithJina({
        url: new URL("https://example.com/recipe"),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(UpstreamFetchError);
  });

  it("throws UpstreamFetchError for empty content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("   ", { status: 200 }));

    await expect(
      fetchWithJina({
        url: new URL("https://example.com/recipe"),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(UpstreamFetchError);
  });
});
```

- [ ] **Step 2: Run the test file to capture the missing fetcher**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/fetch-with-jina.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the minimal Jina fetcher with timeout and body guards**

```ts
// src/lib/recipes/import/fetch-with-jina.ts
import { UpstreamFetchError } from "./errors";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CHARS = 30_000;

function toJinaReaderUrl(url: URL) {
  return `https://r.jina.ai/${url.protocol}//${url.host}${url.pathname}${url.search}`;
}

function normalizeReaderContent(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function fetchWithJina({
  url,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxChars = DEFAULT_MAX_CHARS,
}: {
  url: URL;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxChars?: number;
}) {
  const readerUrl = toJinaReaderUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(readerUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new UpstreamFetchError(`Reader responded with ${response.status}`);
    }

    const content = normalizeReaderContent(await response.text());

    if (!content || content.length < 40) {
      throw new UpstreamFetchError("Reader returned empty content");
    }

    return {
      readerUrl,
      content: content.slice(0, maxChars),
    };
  } catch (error) {
    if (error instanceof UpstreamFetchError) {
      throw error;
    }

    throw new UpstreamFetchError(error instanceof Error ? error.message : "Reader request failed");
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 4: Expand tests for size limit and normalization, then run them**

Add this test:

```ts
it("normalizes blank lines and trims oversized content", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(
    new Response(`Header\n\n\nIngredients\n- flour\n${"x".repeat(500)}`, {
      status: 200,
    }),
  );

  const result = await fetchWithJina({
    url: new URL("https://example.com/recipe"),
    fetchImpl,
    maxChars: 60,
  });

  expect(result.content).not.toContain("\n\n\n");
  expect(result.content.length).toBe(60);
});
```

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/fetch-with-jina.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/fetch-with-jina.ts src/lib/recipes/import/__tests__/fetch-with-jina.test.ts
git commit -m "feat(import): add Jina reader fetcher"
```

### Task 4: Implement structured recipe extraction with OpenAI and schema validation

**Files:**
- Create: `src/lib/recipes/import/extraction-schema.ts`
- Create: `src/lib/recipes/import/extract-recipe.ts`
- Modify: `package.json`
- Test: `src/lib/recipes/import/__tests__/extract-recipe.test.ts`

**Interfaces:**
- Consumes: `recipeInputSchema`, `RecipeExtractionError`, `RecipeValidationError`
- Produces:
  - `recipeExtractionSchema`
  - `extractRecipe({ sourceUrl, content, apiKey?, model? }): Promise<RecipeInput>`

- [ ] **Step 1: Write failing tests for valid extraction output and invalid model payloads**

```ts
// src/lib/recipes/import/__tests__/extract-recipe.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: vi.fn(),
    };
  }

  return { default: OpenAI };
});

import OpenAI from "openai";

import { RecipeValidationError } from "@/lib/recipes/import/errors";
import { extractRecipe } from "@/lib/recipes/import/extract-recipe";

describe("extractRecipe", () => {
  it("returns validated recipe input from structured model output", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        title: "Pancakes",
        description: "Fluffy",
        servings: 4,
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      }),
    });

    (OpenAI as unknown as { prototype: { responses: { create: typeof create } } }).prototype.responses = { create };

    await expect(
      extractRecipe({
        sourceUrl: "https://example.com/recipe",
        content: "Ingredients...Instructions...",
        apiKey: "test-key",
        model: "gpt-5-mini",
      }),
    ).resolves.toMatchObject({
      title: "Pancakes",
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });
  });

  it("throws RecipeValidationError when the model omits instructions", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        title: "Pancakes",
        ingredients: ["1 cup flour"],
        instructions: [],
      }),
    });

    (OpenAI as unknown as { prototype: { responses: { create: typeof create } } }).prototype.responses = { create };

    await expect(
      extractRecipe({
        sourceUrl: "https://example.com/recipe",
        content: "Ingredients...Instructions...",
        apiKey: "test-key",
        model: "gpt-5-mini",
      }),
    ).rejects.toBeInstanceOf(RecipeValidationError);
  });
});
```

- [ ] **Step 2: Run the extraction test to capture missing dependencies and modules**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/extract-recipe.test.ts`

Expected: FAIL because `openai` and extraction modules do not exist.

- [ ] **Step 3: Add the OpenAI dependency and minimal extraction implementation**

```json
// package.json
{
  "dependencies": {
    "openai": "^5.0.0"
  }
}
```

```ts
// src/lib/recipes/import/extraction-schema.ts
import { recipeInputSchema } from "@/lib/recipes/schema";

export const recipeExtractionSchema = recipeInputSchema;
```

```ts
// src/lib/recipes/import/extract-recipe.ts
import OpenAI from "openai";

import { recipeExtractionSchema } from "./extraction-schema";
import { RecipeExtractionError, RecipeValidationError } from "./errors";

const DEFAULT_MODEL = "gpt-5-mini";

export async function extractRecipe({
  sourceUrl,
  content,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_RECIPE_IMPORT_MODEL ?? DEFAULT_MODEL,
}: {
  sourceUrl: string;
  content: string;
  apiKey?: string;
  model?: string;
}) {
  if (!apiKey) {
    throw new RecipeExtractionError("OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Extract a recipe from webpage text. Return JSON only. Do not invent values. Use null for missing optional fields. Ingredients and instructions must be arrays.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Source URL: ${sourceUrl}\n\nPage content:\n${content}`,
          },
        ],
      },
    ],
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new RecipeExtractionError("Model returned non-JSON output");
  }

  const result = recipeExtractionSchema.safeParse(parsed);

  if (!result.success) {
    throw new RecipeValidationError(result.error.message);
  }

  return result.data;
}
```

- [ ] **Step 4: Install and run extraction tests until they pass**

Run: `pnpm install`

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/extract-recipe.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/recipes/import/extraction-schema.ts src/lib/recipes/import/extract-recipe.ts src/lib/recipes/import/__tests__/extract-recipe.test.ts
git commit -m "feat(import): add OpenAI recipe extraction"
```

### Task 5: Implement the webpage importer and persistence helpers

**Files:**
- Create: `src/lib/recipes/import/importers/webpage-importer.ts`
- Create: `src/lib/recipes/import/save-imported-recipe.ts`
- Test: `src/lib/recipes/import/__tests__/webpage-importer.test.ts`
- Test: `src/lib/recipes/import/__tests__/save-imported-recipe.test.ts`

**Interfaces:**
- Consumes: `fetchWithJina`, `extractRecipe`, `RecipePersistenceError`, `db`, `recipe`
- Produces:
  - `webpageImporter: RecipeImporter`
  - `saveImportedRecipe({ input, userId, sourceUrl }): Promise<ImportedRecipe>`

- [ ] **Step 1: Write failing tests for the importer composition and saved row shape**

```ts
// src/lib/recipes/import/__tests__/webpage-importer.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/fetch-with-jina", () => ({
  fetchWithJina: vi.fn(),
}));

vi.mock("@/lib/recipes/import/extract-recipe", () => ({
  extractRecipe: vi.fn(),
}));

import { fetchWithJina } from "@/lib/recipes/import/fetch-with-jina";
import { extractRecipe } from "@/lib/recipes/import/extract-recipe";
import { webpageImporter } from "@/lib/recipes/import/importers/webpage-importer";

describe("webpageImporter", () => {
  it("fetches readable content and passes it to the extractor", async () => {
    vi.mocked(fetchWithJina).mockResolvedValue({
      readerUrl: "https://r.jina.ai/http://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });
    vi.mocked(extractRecipe).mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    const result = await webpageImporter({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });

    expect(fetchWithJina).toHaveBeenCalledOnce();
    expect(extractRecipe).toHaveBeenCalledWith({
      sourceUrl: "https://example.com/recipe",
      content: "Ingredients\n- flour\n\nInstructions\n- mix",
    });
    expect(result.title).toBe("Pancakes");
  });
});
```

```ts
// src/lib/recipes/import/__tests__/save-imported-recipe.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { saveImportedRecipe } from "@/lib/recipes/import/save-imported-recipe";

describe("saveImportedRecipe", () => {
  it("persists an imported recipe with source metadata", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: "recipe-1",
        userId: "user-1",
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
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    const result = await saveImportedRecipe({
      userId: "user-1",
      sourceUrl: "https://example.com/recipe",
      input: {
        title: "Pancakes",
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: ["1 cup flour"],
        instructions: ["Mix ingredients"],
      },
    });

    expect(result.sourceType).toBe("url");
    expect(result.sourceUrl).toBe("https://example.com/recipe");
  });
});
```

- [ ] **Step 2: Run the importer and persistence tests to confirm missing modules**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/webpage-importer.test.ts src/lib/recipes/import/__tests__/save-imported-recipe.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the minimal importer and save helper**

```ts
// src/lib/recipes/import/importers/webpage-importer.ts
import { extractRecipe } from "../extract-recipe";
import { fetchWithJina } from "../fetch-with-jina";
import type { RecipeImporter } from "../types";

export const webpageImporter: RecipeImporter = async ({ url }) => {
  const { content } = await fetchWithJina({ url });

  return extractRecipe({
    sourceUrl: url.toString(),
    content,
  });
};
```

```ts
// src/lib/recipes/import/save-imported-recipe.ts
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import type { RecipeInput } from "@/lib/recipes/schema";

import { RecipePersistenceError } from "./errors";
import type { ImportedRecipe } from "./types";

export async function saveImportedRecipe({
  input,
  userId,
  sourceUrl,
}: {
  input: RecipeInput;
  userId: string;
  sourceUrl: string;
}): Promise<ImportedRecipe> {
  try {
    const [createdRecipe] = await db
      .insert(recipe)
      .values({
        id: crypto.randomUUID(),
        userId,
        sourceType: "url",
        sourceUrl,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        servings: input.servings ?? null,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        cookTimeMinutes: input.cookTimeMinutes ?? null,
        ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
        instructions: input.instructions.map((instruction) => instruction.trim()),
      })
      .returning();

    return createdRecipe;
  } catch (error) {
    throw new RecipePersistenceError(
      error instanceof Error ? error.message : "Recipe insert failed",
    );
  }
}
```

- [ ] **Step 4: Run the focused tests until they pass**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/webpage-importer.test.ts src/lib/recipes/import/__tests__/save-imported-recipe.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/importers/webpage-importer.ts src/lib/recipes/import/save-imported-recipe.ts src/lib/recipes/import/__tests__/webpage-importer.test.ts src/lib/recipes/import/__tests__/save-imported-recipe.test.ts
git commit -m "feat(import): add webpage importer and persistence helper"
```

### Task 6: Add the import orchestration service and wire the API route

**Files:**
- Create: `src/lib/recipes/import/import-recipe-from-url.ts`
- Modify: `src/app/api/recipes/import/route.ts`
- Test: `src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts`
- Test: `src/app/api/recipes/import/route.test.ts`

**Interfaces:**
- Consumes: `detectImportSourceType`, `getRecipeImporter`, `webpageImporter`, `saveImportedRecipe`, `toImportErrorResponse`, `auth.api.getSession`, `importRecipeSchema`
- Produces:
  - `importRecipeFromUrl({ url, userId }): Promise<ImportedRecipe>`
  - fully functional `POST /api/recipes/import`

- [ ] **Step 1: Write failing orchestration and route tests for success, invalid URLs, unauthenticated requests, and unsupported platforms**

```ts
// src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/recipes/import/importer-registry", () => ({
  getRecipeImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/importers/webpage-importer", () => ({
  webpageImporter: vi.fn(),
}));

vi.mock("@/lib/recipes/import/save-imported-recipe", () => ({
  saveImportedRecipe: vi.fn(),
}));

import { getRecipeImporter } from "@/lib/recipes/import/importer-registry";
import { saveImportedRecipe } from "@/lib/recipes/import/save-imported-recipe";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";

describe("importRecipeFromUrl", () => {
  it("detects the source, imports it, and saves the recipe", async () => {
    const importer = vi.fn().mockResolvedValue({
      title: "Pancakes",
      description: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: ["1 cup flour"],
      instructions: ["Mix ingredients"],
    });

    vi.mocked(getRecipeImporter).mockReturnValue(importer);
    vi.mocked(saveImportedRecipe).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
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
    });

    const result = await importRecipeFromUrl({
      url: "https://example.com/recipe",
      userId: "user-1",
    });

    expect(importer).toHaveBeenCalledWith({
      url: new URL("https://example.com/recipe"),
      sourceType: "webpage",
    });
    expect(result.id).toBe("recipe-1");
  });
});
```

```ts
// src/app/api/recipes/import/route.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/recipes/import/import-recipe-from-url", () => ({
  importRecipeFromUrl: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { POST } from "@/app/api/recipes/import/route";

describe("POST /api/recipes/import", () => {
  it("returns 401 when there is no authenticated user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/recipe" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 200 with the created recipe on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(importRecipeFromUrl).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
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
    });

    const response = await POST(
      new Request("http://localhost/api/recipes/import", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/recipe" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: "recipe-1" });
  });
});
```

- [ ] **Step 2: Run the orchestration and route tests to capture missing service wiring**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts src/app/api/recipes/import/route.test.ts`

Expected: FAIL with module/export errors.

- [ ] **Step 3: Implement the orchestration service and update the route**

```ts
// src/lib/recipes/import/import-recipe-from-url.ts
import { getRecipeImporter } from "./importer-registry";
import { webpageImporter } from "./importers/webpage-importer";
import { saveImportedRecipe } from "./save-imported-recipe";
import { detectImportSourceType } from "./source-type";

export async function importRecipeFromUrl({
  url,
  userId,
}: {
  url: string;
  userId: string;
}) {
  const parsedUrl = new URL(url);
  const sourceType = detectImportSourceType(parsedUrl);
  const importer = getRecipeImporter({ sourceType, webpageImporter });
  const input = await importer({ url: parsedUrl, sourceType });

  return saveImportedRecipe({
    input,
    userId,
    sourceUrl: parsedUrl.toString(),
  });
}
```

```ts
// src/app/api/recipes/import/route.ts
import { auth } from "@/lib/auth";
import { toImportErrorResponse } from "@/lib/recipes/import/errors";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { importRecipeSchema } from "@/lib/recipes/schema";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = importRecipeSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid import data",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const createdRecipe = await importRecipeFromUrl({
      url: result.data.url,
      userId: session.user.id,
    });

    return Response.json(createdRecipe, { status: 200 });
  } catch (error) {
    return toImportErrorResponse(error);
  }
}
```

- [ ] **Step 4: Run the new tests and the full import test suite**

Run: `pnpm exec vitest run src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts src/app/api/recipes/import/route.test.ts`

Run: `pnpm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes/import/import-recipe-from-url.ts src/app/api/recipes/import/route.ts src/lib/recipes/import/__tests__/import-recipe-from-url.test.ts src/app/api/recipes/import/route.test.ts
git commit -m "feat(import): wire webpage import route"
```

### Task 7: Update docs and verify the full workflow

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/implementation-tasks.md`

**Interfaces:**
- Consumes: implemented route behavior and module layout
- Produces: updated architecture/task docs that reflect the Jina-first webpage importer

- [ ] **Step 1: Write failing documentation checklist in the commit message scratchpad**

Use this checklist while editing docs:

```md
- architecture says Jina Reader is the primary webpage ingestion layer
- architecture says social importers are future provider modules
- implementation tasks mark import endpoint flow complete or superseded
- docs mention OPENAI_API_KEY and OPENAI_RECIPE_IMPORT_MODEL
```

- [ ] **Step 2: Update the docs to match the shipped implementation**

Add or edit content like this:

```md
# docs/architecture.md
- Webpage imports now fetch readable content from Jina Reader before AI extraction.
- `src/lib/recipes/import/` contains source detection, Jina fetching, extraction, persistence, and orchestration modules.
- Social URL support is intentionally deferred to dedicated future importers.
```

```md
# docs/implementation-tasks.md
- `POST /api/recipes/import` now authenticates, validates, fetches via Jina Reader, extracts recipe data, validates it, saves it, and returns the created recipe.
- Unsupported Instagram/YouTube/TikTok URLs return a controlled error until dedicated importers are implemented.
```

- [ ] **Step 3: Run project verification commands**

Run: `pnpm test`

Run: `pnpm lint`

Expected: PASS

- [ ] **Step 4: Manually verify the happy path and one controlled failure**

Run the dev server and exercise both flows:

```bash
pnpm dev
```

Manual checks:
- Sign in.
- POST a normal recipe URL such as `https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/` through the import page or a REST client.
- Confirm the response includes a saved recipe row with `sourceType: "url"` and the original `sourceUrl`.
- Confirm the recipe appears in the list/detail UI.
- POST an Instagram URL and confirm the response is `422` with `This URL type is not supported yet`.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md docs/implementation-tasks.md
git commit -m "docs(import): update webpage import architecture notes"
```

## Self-Review

### Spec coverage
- Webpage-only support: Tasks 2 and 6 reject Instagram/YouTube/TikTok.
- Jina-first ingestion: Task 3 implements the fetcher; Task 5 composes it into the webpage importer.
- Strict AI extraction and validation: Task 4.
- Save recipe with `sourceUrl` and `sourceType="url"`: Task 5.
- Thin route orchestration: Task 6.
- Testing: Tasks 1 through 7.
- Docs update: Task 7.

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain in task instructions.
- Every task includes explicit files, commands, and code snippets.

### Type consistency
- All tasks use the same function names and signatures declared in the Shared Interfaces section.
- Route success status stays `200`, matching the approved spec.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-recipe-import-webpage.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
