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
- The current homepage (`src/app/page.tsx`) is acting as a temporary auth smoke test page.
- The temporary homepage no longer reads from a throwaway test table; it now shows only landing-page text plus server session state.
- Sign-in and sign-out are handled by client components in `src/components/`.
- Server-rendered session state is read in Server Components with `auth.api.getSession({ headers: await headers() })`.

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

### AI extraction
Backend fetches page content from a URL, sends cleaned text/HTML to an AI model, asks for structured recipe JSON, validates it, then stores it.

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
3. Backend fetches the page.
4. Backend extracts useful content:
   - Prefer JSON-LD recipe data if present
   - Otherwise use main page content
5. Backend sends content to AI with a strict schema.
6. AI returns structured recipe fields.
7. Backend validates result.
8. Backend stores recipe.
9. User sees imported recipe and can edit it.

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

### Recipe
- `id`
- `user_id`
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
1. Fetch HTML from the URL.
2. Check for recipe JSON-LD first.
3. If JSON-LD is missing or poor quality, extract main readable content.
4. Send only relevant content to the AI model.

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
  - AI API key

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
- Basic loading states exist for sign-in and sign-out buttons.
- Server-side session reading is working on the homepage.
- Drizzle schema and paths have been moved under `src/lib/db`.
- The initial recipe data model is now present in `src/lib/db/schema.ts`.
- The old throwaway test-table query has been removed from the homepage and DB helper module.

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
