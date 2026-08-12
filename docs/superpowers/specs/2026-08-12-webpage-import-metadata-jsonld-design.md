# Webpage Import: Cheerio-Based Metadata + JSON-LD Extraction Design

## Summary

Update `apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts` so webpage import uses a Cheerio-based page parsing flow instead of manual regex extraction for JSON-LD script tags. Expand the structured extraction flow to also read page metadata from head tags.

The importer will prioritize:
- metadata for `title`, `description`, and `image`
- JSON-LD for `ingredients`, `instructions`, and other structured recipe fields

If a complete recipe cannot be assembled from structured data, the importer will fall back to LLM extraction from page content. That fallback input will be enriched with available metadata and partial JSON-LD information before passing content into the LLM extractor.

## Goals

- Replace manual JSON-LD script extraction with Cheerio selectors.
- Parse page metadata from `<title>` and `<meta>` tags.
- Prefer metadata for title/description/image.
- Prefer JSON-LD for ingredients/instructions.
- Preserve the existing public contract that structured extraction returns `RecipeInput | null`.
- Improve LLM fallback quality by including metadata and partial JSON-LD signals.

## Non-Goals

- Do not change the external return type of `extractRecipeFromJsonLd`.
- Do not make `image` part of `RecipeInput`.
- Do not attempt broad content scraping beyond the current webpage-import flow.
- Do not introduce a generic site-wide metadata service unless needed by future work.

## Current State

`extract-recipe-from-json-ld.ts` currently:
- scans HTML with a regex for `<script type="application/ld+json">`
- parses JSON-LD blocks with `JSON.parse`
- recursively finds `Recipe` nodes
- converts a complete recipe node into `RecipeInput`
- returns `null` when required fields are missing

`webpage-importer.ts` currently:
1. fetches webpage HTML
2. attempts JSON-LD extraction
3. falls back to markdown conversion + LLM extraction
4. falls back again to Jina on failure

The current fallback loses useful `<head>` metadata and any partial structured recipe data.

## Proposed Design

## 1. Cheerio-based page parsing

Use Cheerio to load the HTML once and query:
- `script[type="application/ld+json"]`
- `title`
- `meta[property="og:title"]`
- `meta[property="og:description"]`
- `meta[property="og:image"]`
- `meta[name="description"]`

This replaces manual regex extraction for JSON-LD blocks and creates a single DOM-oriented parsing path for structured page signals.

## 2. Internal page signals model

Introduce an internal representation of parsed webpage signals, used only inside the webpage import flow.

Suggested shape:
- metadata
  - `title: string | null`
  - `description: string | null`
  - `image: string | null`
- jsonLd
  - parsed blocks
  - discovered recipe nodes
  - best available partial structured recipe fields

This model does not need to be exported publicly if file-local helpers are sufficient.

## 3. Metadata priority rules

For structured assembly and fallback enrichment, use this priority:

### Title
1. `og:title`
2. `<title>`
3. JSON-LD `name` / `headline` only as a lower-priority internal fallback when needed

### Description
1. `og:description`
2. `meta[name="description"]`
3. JSON-LD `description` only as a lower-priority internal fallback when needed

### Image
1. `og:image`
2. no fallback requirement

Metadata is authoritative for title, description, and image whenever present.

## 4. Structured recipe assembly rules

JSON-LD remains authoritative for:
- `ingredients`
- `instructions`
- `servings`
- `prepTimeMinutes`
- `cookTimeMinutes`

Recipe assembly behavior:
- assemble a candidate recipe from JSON-LD structured fields
- override candidate `title` and `description` with prioritized metadata when available
- return a `RecipeInput` only if all required recipe fields are present after assembly

This preserves the current behavior that structured extraction only returns a complete recipe.

## 5. Fallback enrichment behavior

If structured assembly does not produce a complete recipe:
1. convert page HTML to markdown as today
2. construct enriched fallback content
3. pass the enriched content into `extractRecipe(...)`

Enriched fallback content should include, when available:
- prioritized title
- prioritized description
- `og:image`
- partial JSON-LD fields such as:
  - title
  - description
  - servings
  - prep time
  - cook time
  - ingredients
  - instructions
- markdown body content

Preferred formatting:
- prepend a compact structured context block before markdown body content
- include only fields that have non-empty values
- keep formatting deterministic for testability

Example shape:

```text
Page metadata:
Title: ...
Description: ...
Image: ...

Structured recipe data found:
Servings: ...
Prep time: ...
Cook time: ...
Ingredients:
- ...
Instructions:
- ...

Page content:
...markdown...
```

This content is an internal extraction aid only. It does not change external APIs.

## 6. File-level changes

### `apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts`
- replace regex-based script extraction with Cheerio selection
- add helpers for reading metadata from the page
- add helpers for assembling a structured recipe with metadata priority
- keep the exported function returning `RecipeInput | null`
- optionally add a second internal/exported helper for partial page signals if needed by `webpage-importer.ts`

### `apps/web/src/lib/recipes/import/importers/webpage-importer.ts`
- continue trying structured extraction first
- when structured extraction returns `null`, build enriched fallback content from:
  - metadata
  - partial JSON-LD signals
  - markdown body
- send enriched content to `extractRecipe(...)`
- preserve Jina fallback behavior

### Dependency
- add `cheerio` as a direct dependency

## 7. Testing strategy

Add or update tests to cover:

### Structured extraction tests
- selects JSON-LD script blocks with Cheerio
- ignores invalid JSON-LD blocks
- extracts a complete recipe from JSON-LD
- prefers `og:title` over `<title>` and JSON-LD title
- prefers `og:description` over standard meta description and JSON-LD description
- uses metadata title/description together with JSON-LD ingredients/instructions
- returns `null` when the structured recipe is still incomplete

### Webpage importer tests
- when structured extraction succeeds, returns the structured recipe immediately
- when structured extraction fails, fallback content includes:
  - metadata title
  - metadata description
  - `og:image`
  - partial JSON-LD fields
  - markdown body content
- when HTML-based fallback fails, Jina fallback still runs

## 8. Error handling

- ignore malformed JSON-LD blocks
- tolerate missing metadata
- tolerate pages with multiple JSON-LD blocks and nested `@graph` structures
- treat empty strings as missing data after normalization
- never require `image` for recipe completeness
- do not synthesize ingredients or instructions from metadata

## 9. Implementation notes

- Preserve existing normalization utilities where still useful.
- Keep helper responsibilities narrow:
  - DOM parsing
  - metadata extraction
  - JSON-LD recipe node discovery
  - recipe assembly
  - fallback content formatting
- Prefer deterministic formatting for enriched fallback text to keep tests stable.
- Avoid over-generalizing beyond webpage import needs.

## 10. Success criteria

- JSON-LD discovery uses Cheerio rather than regex scanning.
- Metadata is correctly prioritized for title/description/image.
- JSON-LD remains the source for ingredients/instructions.
- Complete structured recipes are returned directly.
- Incomplete structured recipes trigger LLM fallback with enriched context.
- Existing importer fallback chain remains intact.
