# Shared Imported Recipe Cache Design

## Status
Approved for planning

## Summary
Add a shared canonical import cache so imported recipes fetched from the same normalized URL are only extracted once upstream, while each user still gets their own editable recipe copy.

This keeps the current user-owned recipe CRUD model intact, avoids repeated Jina/OpenAI work, and prevents duplicate saved copies for the same user and normalized URL.

## Goals
- Avoid repeated upstream import work for the same normalized recipe URL.
- Keep user recipes independently editable.
- Ensure each user can save at most one copy per normalized URL.
- Keep import route behavior simple and idempotent.
- Preserve the existing recipe CRUD model as much as possible.

## Non-Goals
- Fuzzy deduplication across different URLs.
- Shared editing across users.
- Canonical recipe updates propagating into user copies.
- Re-import/version-sync behavior.

## Requirements Confirmed
- Each user should get their own editable copy.
- Deduplication is based on exact normalized URL only.
- Each user should only have one saved copy per normalized URL.

## Recommended Approach
Use a separate canonical cache table plus normal user-owned recipe rows.

### Tables
1. `imported_recipe`
   - one canonical imported recipe per normalized URL
   - used to avoid repeated upstream import requests

2. `recipe`
   - remains the user-owned editable table
   - stores the actual recipe record shown and edited in the app

This is preferred over a `user_recipe` join table because a join table alone implies shared recipe rows, which conflicts with the requirement that each user has an independently editable copy.

## Data Model

### New table: `imported_recipe`
Columns:
- `id`
- `normalized_source_url` unique not null
- `original_source_url` not null
- `title` not null
- `description` nullable
- `servings` nullable
- `prep_time_minutes` nullable
- `cook_time_minutes` nullable
- `ingredients` not null
- `instructions` not null
- `created_at` not null
- `updated_at` not null

Purpose:
- holds the canonical extracted result for a normalized URL
- never directly edited by end users
- acts as the cache layer for import reuse

### Existing table: `recipe`
Keep existing user-owned structure and add:
- `normalized_source_url` nullable
- `imported_recipe_id` nullable FK to `imported_recipe.id`

Behavior:
- manual recipes keep `normalized_source_url = null`
- imported user recipes store normalized URL
- imported user recipes may reference the canonical cached source row

### Constraint
Add uniqueness on user-owned imported URLs:
- unique `(user_id, normalized_source_url)`

This enforces one saved copy per user per normalized URL.

## Import Flow
For `POST /api/recipes/import`:

1. authenticate user
2. validate request body
3. normalize URL once
4. look up existing user recipe by `(user_id, normalized_source_url)`
   - if found, return it with `200`
5. look up canonical `imported_recipe` by `normalized_source_url`
   - if found, clone it into a new user-owned `recipe`
6. if not found
   - run current importer flow
   - save canonical row in `imported_recipe`
   - clone canonical data into a new user-owned `recipe`
7. return the user-owned recipe

## Route Behavior
### Existing user already saved this URL
- do not create another recipe row
- do not call upstream importer
- return existing saved recipe with `200`

### Another user already caused this URL to be imported
- do not call upstream importer again
- reuse canonical `imported_recipe`
- create a new user-owned `recipe` copy

### First import for this normalized URL
- run current importer flow
- save one canonical row
- save one user-owned row

## URL Normalization
Normalization must happen in one shared utility before any lookup or insert.

Recommended conservative normalization for v1:
- lowercase host
- remove default ports
- normalize trailing slash
- preserve path
- preserve query string

The normalized URL is the source of truth for:
- canonical cache lookup
- user-level uniqueness
- duplicate detection

## Persistence Design
Suggested helpers:
- `normalizeRecipeSourceUrl(url)`
- `findUserRecipeByNormalizedUrl(userId, normalizedUrl)`
- `findImportedRecipeByNormalizedUrl(normalizedUrl)`
- `createImportedRecipe(...)`
- `createUserRecipeFromImportedRecipe(...)`

Keep `src/app/api/recipes/import/route.ts` orchestration-only.

## Error Handling
- invalid URL → `400`
- unauthenticated → `401`
- upstream fetch/import failure on canonical miss → existing import error mapping
- same-user duplicate import → return existing recipe `200`
- user recipe insert uniqueness race → re-query by `(user_id, normalized_source_url)` and return existing row

## Concurrency
The unique constraint on `(user_id, normalized_source_url)` is the source of truth.

If concurrent requests try to create the same user-owned imported recipe:
- one insert wins
- the loser re-queries the existing row
- endpoint still returns a single stable saved recipe

## Tradeoffs Considered

### Option A: `user_recipe` join table to shared `recipe`
Pros:
- less data duplication

Cons:
- conflicts with independent editing requirement
- edits would affect all linked users unless much more complexity is added

Decision: rejected.

### Option B: canonical `imported_recipe` + cloned user `recipe`
Pros:
- simple mental model
- preserves current CRUD ownership model
- avoids repeated Jina/OpenAI calls
- keeps user edits isolated

Cons:
- duplicates recipe content across user-owned rows

Decision: recommended.

### Option C: single `recipe` table for both canonical and user rows
Pros:
- fewer tables

Cons:
- mixes cache rows and user-facing rows
- increases query ambiguity and maintenance cost

Decision: rejected.

## Testing Strategy
Add coverage for:
- existing user recipe returned for same normalized URL
- cached canonical recipe reused without calling importer
- canonical miss creates canonical row and user-owned row
- second user reuses canonical row and gets own copy
- concurrent duplicate user insert resolves to one saved recipe
- normalization treats equivalent URLs the same

## Migration Notes
Schema changes required:
- create `imported_recipe`
- add `recipe.normalized_source_url`
- add `recipe.imported_recipe_id`
- add unique constraint on `(user_id, normalized_source_url)`

Data migration for existing rows can stay minimal:
- existing manual recipes remain unchanged
- existing imported recipes can leave the new fields null unless a backfill is explicitly needed later

## Recommendation
Implement a shared `imported_recipe` cache keyed by normalized URL, keep `recipe` as the user-owned editable record, and make import requests idempotent per user and normalized URL.

This is the simplest design that satisfies:
- shared upstream import savings
- independent per-user editing
- one saved copy per user per normalized URL
- minimal disruption to the existing codebase
