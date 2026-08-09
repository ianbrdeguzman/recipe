# Recipe Import Design: Webpage-First URL Extraction

## Status
Approved for planning

## Summary
Implement `POST /api/recipes/import` as a webpage-first import pipeline that accepts a URL, fetches normalized readable content through Jina Reader, extracts structured recipe data with AI, validates the result with the existing recipe schema, saves the recipe for the authenticated user, and returns the created recipe.

This design intentionally limits the first implementation to normal recipe webpages. Social platforms such as Instagram, YouTube, and TikTok will be added later through dedicated importer modules without changing the API contract.

## Goals
- Support importing a recipe from a normal webpage URL.
- Use `jina.ai/reader` as the primary content ingestion path.
- Keep the API route small and readable.
- Validate all extracted recipe data before saving.
- Preserve the original source URL on the saved recipe.
- Create an architecture that can later support platform-specific importers.

## Non-Goals
- Full Instagram, YouTube, TikTok, or other social-platform support in this phase.
- Client-side preview or confirmation before save.
- Direct HTML scraping or JSON-LD parsing as the primary import strategy.
- Bulk imports.

## User-Facing Behavior
`POST /api/recipes/import` will:
1. authenticate the user
2. validate the request body
3. classify the URL source
4. dispatch to an importer
5. extract structured recipe data
6. validate the extracted data
7. save the recipe
8. return the created recipe

The initial implementation saves immediately on success.

## API Contract
### Request
```json
{
  "url": "https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/"
}
```

### Success response
- Status: `200`
- Body: created recipe record

### Error responses
- `400` invalid request body or URL
- `401` unauthenticated request
- `422` supported request shape but no usable recipe content could be extracted
- `424` upstream fetch failure from Jina Reader
- `502` AI extraction failure or invalid model output
- `500` unexpected internal failure

User-safe messages should stay simple and actionable.

## Architecture
The route should remain orchestration-only. Import-specific logic moves into focused modules.

### Proposed modules
- `src/lib/recipes/import/source-type.ts`
  - Detects import source class from URL.
  - Initial result set: `webpage`, `instagram`, `youtube`, `tiktok`, `unsupported`.
  - Only `webpage` is implemented in this phase.

- `src/lib/recipes/import/importer-registry.ts`
  - Maps source type to an importer implementation.
  - Returns the webpage importer now.
  - Provides a stable extension point for future platform importers.

- `src/lib/recipes/import/importers/webpage-importer.ts`
  - Fetches readable content from Jina Reader.
  - Performs content sanity checks.
  - Calls recipe extraction.
  - Returns validated recipe input data ready to save.

- `src/lib/recipes/import/fetch-with-jina.ts`
  - Builds the Jina Reader URL.
  - Performs the network request.
  - Applies timeout, response-size, and empty-body checks.
  - Returns normalized text content and any useful metadata.

- `src/lib/recipes/import/extract-recipe.ts`
  - Sends source text to the AI model with a strict recipe schema target.
  - Produces structured recipe candidate data.

- `src/lib/recipes/import/errors.ts`
  - Defines typed import errors.
  - Encodes safe message, machine code, and HTTP status mapping.

- `src/lib/recipes/import/save-imported-recipe.ts`
  - Persists a validated recipe for the authenticated user.
  - Sets `sourceType` to `url` and stores `sourceUrl`.

## Source Classification
The import pipeline should classify URLs before dispatch.

### Initial rules
- `instagram.com` or `www.instagram.com` → `instagram`
- `youtube.com`, `www.youtube.com`, `youtu.be` → `youtube`
- `tiktok.com`, `www.tiktok.com` → `tiktok`
- all other valid `http`/`https` URLs → `webpage`

### Phase 1 behavior
If the source type is one of the future social providers, the route should return a controlled unsupported response rather than pretending the webpage importer fully supports it.

This prevents accidental low-quality imports while preserving a clear upgrade path.

## Webpage Import Flow
### Step 1: Validate and normalize URL
Use the existing `importRecipeSchema` and construct a `URL` object once inside the import pipeline for normalized handling.

### Step 2: Fetch through Jina Reader
The webpage importer should use Jina Reader as the primary retrieval layer because direct scraping and JSON-LD access are unreliable on bot-protected recipe sites.

The fetch module should:
- construct the Jina Reader endpoint for the target URL
- use a server-side timeout
- reject non-OK upstream responses
- reject empty or trivially short content
- reject clearly unusable content such as generic errors or access blocks when detectable
- cap maximum accepted text size before passing content to AI

### Step 3: Clean and prepare content
Normalize the fetched text to reduce extraction noise:
- trim leading and trailing whitespace
- collapse repeated blank lines
- strip obvious reader boilerplate if present
- preserve ingredient and instruction list structure when possible

Do not attempt heavy parsing in this phase. Jina output is treated as readable source text, not authoritative structured recipe data.

### Step 4: AI extraction
Pass the normalized content plus the source URL to the extraction module.

The extraction contract should target the existing recipe shape:
- `title`
- `description`
- `servings`
- `prepTimeMinutes`
- `cookTimeMinutes`
- `ingredients`
- `instructions`

The prompt should:
- ask for recipe extraction only
- prefer explicit values present in the source
- avoid invented values
- require omission or `null` for missing optional metadata
- require at least one ingredient and one instruction

### Step 5: Validate extracted data
Validate the AI result against the existing `recipeInputSchema` or a dedicated import-output schema aligned with it.

If validation fails:
- do not save
- return a controlled extraction failure

### Step 6: Save recipe
Persist the extracted recipe for the current user.

The saved record should include:
- `userId`
- `sourceType: "url"`
- `sourceUrl: original URL`
- extracted recipe fields

### Step 7: Return created recipe
Return the created record from the route after successful save.

## Error Handling Design
Use typed errors so route logic stays small and predictable.

### Error categories
- `ImportValidationError`
  - malformed URL or bad request body
  - mapped to `400`

- `UnsupportedImportSourceError`
  - source recognized but not yet implemented
  - mapped to `422`

- `UpstreamFetchError`
  - Jina Reader unavailable, timeout, bad status, or unusable response
  - mapped to `424`

- `RecipeExtractionError`
  - AI request failed or returned no usable recipe
  - mapped to `502` or `422` depending on failure mode

- `RecipeValidationError`
  - extracted output failed schema validation
  - mapped to `502`

- `RecipePersistenceError`
  - save failed unexpectedly
  - mapped to `500`

### User-facing messages
Examples:
- `Could not fetch recipe URL`
- `Could not extract recipe automatically`
- `This URL type is not supported yet`
- `Please try manual entry instead`

Do not expose raw upstream or model errors in the response body.

## Data and Schema Notes
No request schema changes are required for phase 1.

The current `importRecipeSchema` is sufficient:
- accepts `http` and `https`
- rejects invalid URLs

The extracted output should be validated against existing recipe constraints:
- title required
- at least one ingredient
- at least one instruction
- optional numeric metadata must be positive integers when present

## Logging and Observability
Add server-side logs for:
- source type classification
- upstream fetch failures
- extraction failures
- validation failures
- successful imports

Logs should include the source URL and internal error code, but not sensitive user data beyond what is already necessary for request tracing.

## Testing Strategy
### Unit tests
- `importRecipeSchema` URL acceptance and rejection cases
- source classification rules
- importer registry dispatch
- Jina URL construction
- Jina fetch handling for timeout, bad status, empty body, oversized body
- extracted output validation
- HTTP status mapping for typed errors

### Integration tests
- authenticated import success path for a mocked webpage import
- unauthenticated request returns `401`
- invalid URL returns `400`
- unsupported future platform URL returns controlled failure
- upstream Jina failure returns controlled failure
- invalid AI output is rejected and not saved

### Manual verification
- import a normal recipe webpage URL such as an Allrecipes page
- verify recipe appears in list and detail views
- verify `sourceUrl` is stored
- verify repeated failure states show clear guidance toward manual entry

## Implementation Notes
- Keep `route.ts` focused on auth, parsing, importer dispatch, persistence call, and response formatting.
- Prefer dependency seams in importer modules so Jina fetch and AI extraction can be mocked in tests.
- Do not build social-platform logic into the webpage importer.
- Do not silently route Instagram, YouTube, or TikTok URLs through the webpage importer in phase 1.

## Future Extensions
When social imports are added, keep the request contract the same and add importer implementations behind the registry:
- `instagram-importer`
- `youtube-importer`
- `tiktok-importer`

Each can use a different retrieval strategy, such as captions, transcripts, page-reader output, or platform-specific parsing, while still returning the same validated recipe shape to the save layer.

## Decisions Captured
- Start with webpage imports only.
- Save immediately on successful extraction.
- Use Jina Reader as the default primary content fetcher.
- Structure the system as a provider-based import pipeline now, even with only one implemented provider.
- Keep social media platforms as separate future importers.

## Open Questions Deferred
These do not block phase 1 and can be decided during implementation planning if needed:
- exact timeout and response-size limits for Jina responses
- exact model and API surface used by `extract-recipe.ts`
- whether to store raw imported source text for debugging
- whether to attach import diagnostics to logs only or also internal metrics
