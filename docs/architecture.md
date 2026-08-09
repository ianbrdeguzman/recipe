# Architecture

## Goal
Build the simplest web app that lets users store recipes.

Two input paths:
1. User enters recipe manually.
2. User pastes a recipe URL, the system uses AI to extract recipe data, then stores it.

Guiding principles:
- **KISS**: choose the simplest working design.
- **YAGNI**: do not build features until needed.

## Scope

### In scope
- Basic user accounts
- Create, view, list, edit, delete recipes
- Manual recipe entry
- URL import flow
- AI extraction from webpage content
- Store normalized recipe data

### Out of scope
- Social features
- Ratings, comments, likes
- Meal planning
- Grocery lists
- Browser extension
- Mobile app
- Complex scraping pipeline
- Background job system unless proven necessary

## High-Level Design

### Frontend
A single web app with simple pages:
- Sign in with Google
- Recipe list
- Recipe detail
- New recipe
- Edit recipe
- Import from URL

Current implementation notes:
- The app uses the Next.js App Router.
- The homepage (`src/app/page.tsx`) now acts as a public landing page with sign-in/session UI.
- The homepage now also reads auth-related query params and shows plain-language error messages for cases like required sign-in, failed sign-in, canceled sign-in, and failed sign-out.
- An authenticated route-group layout exists at `src/app/(app)/layout.tsx`.
- The recipe list page at `/recipes` now renders a real server component dashboard backed by a Drizzle query scoped to the authenticated user.
- The new recipe page at `/recipes/new` now renders a real manual-entry screen with a client form component at `src/components/new-recipe-form.tsx`.
- Global form-control styling in `src/app/globals.css` now improves text and placeholder contrast for inputs and textareas.
- The recipe detail page at `/recipes/[id]` now renders a real server component detail view scoped to the authenticated user.
- Custom not-found UIs now exist at `src/app/not-found.tsx` for app-wide 404s and `src/app/(app)/not-found.tsx` for signed-in recipe-area missing-resource states.
- Placeholder pages still exist for `/recipes/import` and `/recipes/[id]/edit`.
- Sign-in and sign-out are handled by client components in `src/components/`.
- The sign-in button now uses the task language "Continue with Google", redirects successful sign-in to `/recipes`, and passes an auth failure callback back to `/`.
- Both auth buttons now handle unexpected client-side initiation failures with inline error messages in addition to loading states.
- Server-rendered session state is read in Server Components with `auth.api.getSession({ headers: await headers() })`.
- Unauthenticated users are redirected from recipe routes back to `/`.
- The public landing page can display auth error states when redirects or auth flows include a supported `error` query param.

### Backend
A simple server with REST endpoints:
- Auth
- Recipe CRUD
- URL import endpoint

Current implementation notes:
- Auth is already wired through a Next.js Route Handler at `src/app/api/auth/[...all]/route.ts`.
- The route handler uses `toNextJsHandler(auth)` from Better Auth.

### Database
One relational database for users and recipes.

Current implementation notes:
- Drizzle config now points to `src/lib/db/schema.ts` and outputs under `src/lib/db`.
- Drizzle Kit now reads its connection string from `DRIZZLE_DATABASE_URL`.
- The runtime database client lives in `src/lib/db/index.ts` and reads `DATABASE_URL`.
- The Postgres client uses `prepare: false` for transaction-pool compatibility.
- The initial `recipe` table and `recipe_source_type` enum have been added to the schema.
- Imported recipe URLs now normalize before lookup and persistence.
- A shared `imported_recipe` table now stores canonical extracted payloads keyed by normalized URL.
- The `recipe` table now stores one editable per-user copy per normalized URL and can reference its canonical imported source row.
- An idempotent recipe seed script now exists at `src/scripts/seed-recipes.ts`.
- The seed script is exposed as `pnpm db:seed` and inserts mock recipes for the fixed user ID `nmvtmxLrMHiXCMlpFH5jn9DDVYGpAonU` when those titles do not already exist.

### AI extraction
Backend fetches page content from a URL, sends cleaned text/HTML to an AI model, asks for structured recipe JSON, validates it, then stores it.

Current implementation notes:
- `src/lib/recipes/import/extract-recipe.ts` now uses the OpenAI Responses API `parse()` path instead of prompt-only JSON parsing.
- Recipe extraction now sends an explicit strict `json_schema` response format with a top-level object shape.
- All recipe fields are required in the structured output contract, with optional app fields represented as nullable values.
- Extracted output is still validated again with `recipeExtractionSchema` before persistence.

## Suggested Stack
Keep stack minimal and common:
- **Frontend**: Next.js
- **Backend**: Next.js API routes or Route Handlers
- **Database**: Postgres
- **ORM**: Drizzle ORM
- **Auth**: Better Auth with Google OAuth
- **AI**: OpenAI structured extraction
- **Hosting**: Vercel + managed Postgres

If preferred, this can also be a plain React frontend plus Node/Express backend, but Next.js keeps everything in one project.

## Core Flows

### 1. Manual recipe entry
1. User opens “New Recipe”.
2. User fills in title, ingredients, instructions, optional metadata.
3. Frontend sends data to backend.
4. Backend validates and stores recipe.
5. User is redirected to recipe detail page.

### 2. Import recipe from URL
1. User pastes recipe URL.
2. Frontend calls `POST /api/recipes/import`.
3. Backend classifies the URL source.
4. For normal webpage URLs, backend fetches readable content through Jina Reader.
5. Backend sends the normalized content to AI with a strict structured-output schema.
6. AI returns parsed structured recipe fields.
7. Backend validates the parsed result against the app recipe schema.
8. Backend normalizes the URL and checks for an existing saved recipe for that user.
9. If no user copy exists, backend reuses a canonical cached import when available, or imports upstream once on cache miss.
10. Backend stores a user-owned editable recipe with `sourceType="url"` and the normalized `sourceUrl`.
11. User sees imported recipe and can edit it.

## Minimal Data Model

### User
- `id`
- `email`
- `name`
- `image` (nullable)
- `email_verified`
- `created_at`
- `updated_at`

### Auth Account / Session
Use the Better Auth tables required for Google OAuth and session persistence. Do not store password hashes for this version of the app.

Current Better Auth schema in `src/lib/db/schema.ts` includes:
- `user`
- `session`
- `account`
- `verification`

Google OAuth is the only configured provider right now.

### ImportedRecipe
- `id`
- `normalized_source_url` (unique)
- `original_source_url`
- `title`
- `description` (nullable)
- `servings` (nullable)
- `prep_time_minutes` (nullable)
- `cook_time_minutes` (nullable)
- `ingredients` (JSON or text array)
- `instructions` (JSON or text array)
- `created_at`
- `updated_at`

### Recipe
- `id`
- `user_id`
- `imported_recipe_id` (nullable)
- `normalized_source_url` (nullable)
- `source_type` (`manual` | `url`)
- `source_url` (nullable)
- `title`
- `description` (nullable)
- `servings` (nullable)
- `prep_time_minutes` (nullable)
- `cook_time_minutes` (nullable)
- `ingredients` (JSON or text array)
- `instructions` (JSON or text array)
- `created_at`
- `updated_at`

## API Endpoints

### Auth
- Better Auth route handlers for Google OAuth sign-in and sign-out
- The app should use Better Auth's standard server/client helpers instead of custom email/password auth endpoints

### Recipes
- `GET /api/recipes`
- `POST /api/recipes`
- `GET /api/recipes/:id`
- `PUT /api/recipes/:id`
- `DELETE /api/recipes/:id`

### Import
- `POST /api/recipes/import`
  - Input: `{ "url": "https://..." }`
  - Output: created recipe record

## AI Extraction Design

### Input strategy
Keep it simple:
1. Classify the incoming URL by source type.
2. For webpage URLs, fetch readable content from Jina Reader.
3. Normalize the returned text and reject empty or unusable content.
4. Send only relevant content to the AI model.
5. Reserve Instagram, YouTube, and TikTok for future dedicated importers.

### Prompting
Ask the model to return only structured JSON matching the recipe schema:
- title
- description
- servings
- prep time
- cook time
- ingredients
- instructions

### Validation
Backend must validate AI output before saving:
- Title required
- At least 1 ingredient
- At least 1 instruction step
- Ignore extra fields

If validation fails, return an error and ask user to try manual entry.

### Import cache behavior
- Normalize the incoming URL before any lookup.
- Return the existing user-owned recipe if that normalized URL is already saved by the same user.
- Reuse a canonical cached `imported_recipe` across users before making any upstream Jina/OpenAI request.
- Recover gracefully from same-user duplicate insert races by re-querying the existing saved recipe.

## Security and Safety
Keep only the basics:
- Require authentication for recipe access
- Scope recipe queries by `user_id`
- Validate all request payloads
- Restrict URL import to `http/https`
- Add fetch timeout and size limit for imported pages
- Log import failures without storing sensitive secrets

## Error Handling
- If page fetch fails: show “Could not fetch recipe URL”
- If AI extraction fails: show “Could not extract recipe automatically”
- If stored recipe is incomplete: allow user to edit before saving final version, or save draft if needed later
- If a recipe does not exist or is not owned by the current user: show a clear not-found screen instead of a blank page

For V1, simplest option: only save when extraction passes validation.

## Non-Functional Requirements
Minimal expectations:
- Basic responsive UI
- Reasonable import latency (a few seconds is acceptable)
- Simple server-side logging
- Basic monitoring through hosting platform

## Deployment
- One web app deployment
- One Postgres database
- Environment variables for:
  - `DATABASE_URL`
  - `BETTER_AUTH_URL`
  - Better Auth secret
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `OPENAI_API_KEY`
  - `OPENAI_RECIPE_IMPORT_MODEL` (optional override)

Note: the current auth config explicitly reads `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` from environment variables.

For a hosted Postgres provider that uses transaction pool mode, configure the Node Postgres client accordingly (for example, `prepare: false` with `postgres-js` when required).

## Implementation Plan

### Phase 1
- Set up app shell and Better Auth with Google OAuth
- Add recipe CRUD
- Add manual recipe entry
- Add recipe list/detail pages

Phase 1 progress so far:
- Better Auth is installed and configured.
- Google sign-in is wired through the Better Auth client.
- Sign-out is implemented.
- Sign-in and sign-out buttons now have loading states plus inline fallback error handling for unexpected client-side failures.
- The sign-in button label now reads "Continue with Google" and sends Better Auth success/failure redirects to `/recipes` and `/?error=auth-failed`.
- The public landing page now surfaces plain-language auth error messages from supported `error` query params.
- Server-side session reading is working on the homepage and authenticated layout.
- Drizzle schema and paths have been moved under `src/lib/db`.
- The initial recipe data model is now present in `src/lib/db/schema.ts`.
- The old throwaway test-table query has been removed from the homepage and DB helper module.
- A shared authenticated app shell and navigation scaffold now exist.
- The recipe list page is now implemented as a real authenticated dashboard with an empty state and recipe links.
- The new recipe page now supports manual creation through `src/components/new-recipe-form.tsx`, including repeatable ingredient/instruction rows, loading state, validation error display, and redirect on success.
- Global form-control styling in `src/app/globals.css` now improves text and placeholder contrast for inputs and textareas.
- The recipe detail page is now implemented as a real authenticated view with recipe metadata, ingredient/instruction lists, and delete initiation.
- Dedicated app-wide and authenticated-area not-found pages now exist for missing routes and missing recipe resources.
- The import API route is now implemented as a thin orchestrator in `src/app/api/recipes/import/route.ts`.
- Webpage import modules now live under `src/lib/recipes/import/` for source detection, Jina fetching, extraction, persistence, and orchestration.
- Recipe extraction now uses OpenAI Responses structured outputs with an explicit JSON schema and app-side validation.
- Social-platform URLs are intentionally rejected for now until dedicated importers are added.
- The import page UX is still pending, but the backend import pipeline now exists.
- A repeatable mock-data seed path now exists via `pnpm db:seed` for the fixed test user `nmvtmxLrMHiXCMlpFH5jn9DDVYGpAonU`.

### Phase 2
- Add URL import form
- Fetch webpage content on backend
- Add AI extraction and validation
- Store imported recipes

### Phase 3
- Small polish only if needed
- Better error messages
- Basic loading states

## Deliberate Non-Decisions
To stay KISS/YAGNI, do **not** add yet:
- queue workers
- caching layer
- vector database
- embeddings/search
- scraping microservices
- ingredient normalization pipeline
- duplicate detection
- version history
- collaborative editing

## Future Extensions
Only if proven necessary later:
- Tags and search
- Draft recipes
- Import history
- Re-import from source URL
- Better parsing/scraping fallback logic
- Background jobs for slow imports
