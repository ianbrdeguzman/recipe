# Implementation Tasks

This document turns the implementation plan in `docs/architecture.md` into detailed execution tasks. Each phase is broken down so a junior developer can work independently with clear scope, expected deliverables, and acceptance criteria.

---

## General Project Rules

Apply these rules in every phase:

- Keep the solution simple.
- Do not build features that are not explicitly required.
- Prefer server-side validation for all writes.
- Keep recipe access scoped to the logged-in user only.
- Use environment variables for secrets.
- Write code that is easy to read and easy to change.
- If a task introduces uncertainty, choose the simplest approach that satisfies the architecture.

Recommended stack from the architecture:

- Next.js
- Postgres
- Drizzle ORM
- Better Auth with Google OAuth
- OpenAI for recipe extraction

---

## Phase 1: App Shell, Auth, Recipe CRUD, Manual Entry

### Phase Goal
Build the first usable version of the product where a user can:

- sign in with Google
- sign out
- create recipes manually
- view their recipes in a list
- view a recipe detail page
- edit a recipe
- delete a recipe

At the end of this phase, URL import is not required yet.

---

### Task 1.1: Initialize the project and base application structure

#### Objective
Create the application foundation so all later work has a stable structure.

#### Requirements
- Create a Next.js application.
- Set up TypeScript.
- Set up linting and formatting if not included already.
- Add a basic folder structure for:
  - pages/routes
  - components
  - server utilities
  - database under `src/lib/db`
  - validation schemas
- Add a shared layout with navigation.

#### Current status
- In progress / partially complete.
- `src/components/` and `src/lib/` now exist.
- Database code has been moved from `src/drizzle/` to `src/lib/db/`.
- App Router scaffolding now exists for the public homepage plus authenticated recipe routes.
- Shared placeholder UI components have been added for mock page scaffolding.

#### Suggested deliverables
- A working app that runs locally.
- A base layout with placeholder navigation links:
  - Recipes
  - New Recipe
  - Import Recipe
  - Sign In with Google / Sign Out

#### Acceptance criteria
- App starts locally without errors.
- Routes can be added cleanly.
- Base layout renders on all main pages.
- Project structure is organized and understandable.

---

### Task 1.2: Configure the database and Drizzle

#### Objective
Set up persistent storage for users and recipes.

#### Requirements
- Install and configure `drizzle-orm`, `drizzle-kit`, and the Postgres driver.
- Connect Drizzle to Postgres using `DATABASE_URL`.
- Create the initial Drizzle schema.
- Add migrations.

#### Suggested setup
Install dependencies:
- `npm install drizzle-orm postgres`
- `npm install drizzle-kit --save-dev`

Add environment configuration:
- Define `DATABASE_URL` in `.env` for the runtime app connection
- Define `DRIZZLE_DATABASE_URL` in `.env` for Drizzle Kit migrations/introspection
- Example: `postgresql://...`

Create a schema file such as `src/lib/db/schema.ts` for table definitions.

Create a database client module that:
- imports `drizzle` from `drizzle-orm/postgres-js`
- imports `postgres` from `postgres`
- reads `process.env.DATABASE_URL`
- initializes the Postgres client with `prepare: false` when using transaction pool mode
- exports the Drizzle database instance

#### Data model requirements
Implement at least these models based on the architecture:

##### User
- `id`
- `email`
- `name` nullable
- `image` nullable
- `created_at`

##### Better Auth tables
- Add the Better Auth tables required for Google OAuth account linkage and session persistence.
- Do not store password hashes for this app version.

##### Recipe
- `id`
- `user_id`
- `source_type` (`manual` or `url`)
- `source_url` nullable
- `title`
- `description` nullable
- `servings` nullable
- `prep_time_minutes` nullable
- `cook_time_minutes` nullable
- `ingredients`
- `instructions`
- `created_at`
- `updated_at`

#### Implementation notes
- Define a one-to-many relationship from user to recipes.
- Store ingredients and instructions in the simplest usable format.
  - Prefer JSON arrays if convenient with Drizzle/Postgres.
  - If needed, use text arrays or serialized JSON.
- Add timestamps with sensible defaults.

#### Acceptance criteria
- Drizzle schema matches architecture requirements.
- Migration runs successfully.
- Database tables are created.
- The app can connect to the database locally using `DATABASE_URL`.
- The database client is configured correctly for the chosen Postgres host/pool mode.

#### Current status
- Partially complete.
- `drizzle-orm`, `drizzle-kit`, and `postgres` are installed.
- `drizzle.config.ts` now points to `src/lib/db/schema.ts`, outputs under `src/lib/db`, and reads `DRIZZLE_DATABASE_URL`.
- `src/lib/db/index.ts` creates the Postgres client with `prepare: false` and reads `DATABASE_URL`.
- Better Auth tables have been added to the Drizzle schema.
- The `recipe` table and `recipe_source_type` enum have been added.
- The temporary `test` table and helper query have been removed.

---

### Task 1.3: Implement authentication with Better Auth and Google OAuth

#### Objective
Allow users to securely sign in with Google and access only their own recipes.

#### Requirements
- Install and configure Better Auth.
- Configure Google OAuth.
- Implement sign in.
- Implement sign out.
- Persist user session.
- Protect authenticated routes.

#### Minimum auth behavior
- A new user can sign in with Google and have a local user record created if needed.
- Existing users can sign in again with the same Google account.
- Logged-out users cannot access recipe pages or recipe APIs.
- Logged-in users stay signed in across page navigation.

#### API requirements
- Add the Better Auth route handler(s) required for Google OAuth and session handling.
- Use Better Auth's standard server/client helpers instead of custom email/password auth endpoints.

#### UI requirements
Create a sign-in page or entry point that includes:
- a “Continue with Google” button
- a sign-out action
- an error message area for failed auth flows

#### Security requirements
- Do not store passwords or password hashes.
- Keep OAuth secrets in environment variables.
- Validate and trust the authenticated session on the server for recipe access.
- Return generic auth errors that do not leak unnecessary information.

#### Acceptance criteria
- User can sign in with Google successfully.
- User can sign out successfully.
- Protected routes redirect unauthenticated users.
- No password hashes are stored in the database.

#### Current status
- Mostly complete for the base auth flow.
- Better Auth is configured in `src/lib/auth/index.ts` with the Drizzle adapter and Google as the social provider.
- The auth route handler exists at `src/app/api/auth/[...all]/route.ts`.
- The client helper exists at `src/lib/auth/client.ts`.
- `src/components/signin-button.tsx` and `src/components/signout-button.tsx` are implemented.
- Sign-out refreshes the current route so server-rendered session state updates.
- Sign-in and sign-out both have basic loading states.
- Base route protection now exists in `src/app/(app)/layout.tsx`, which redirects unauthenticated users away from recipe routes.

---

### Task 1.4: Add authenticated app shell and navigation

#### Objective
Make the main app usable once a user is logged in.

#### Requirements
- Add a shared layout for authenticated pages.
- Add navigation links for recipe flows.
- Show sign in/sign out state in the UI.
- Add route guards where necessary.

#### Required pages
- recipe list page
- recipe detail page
- new recipe page
- edit recipe page

#### UX requirements
- Logged-in users should be able to navigate between recipe pages easily.
- Logged-out users should be directed to sign in with Google.

#### Acceptance criteria
- Navigation is visible and functional.
- Auth state is reflected correctly in the layout.
- Main app pages are reachable after sign-in.

#### Current status
- Partially complete.
- `src/app/(app)/layout.tsx` now provides a shared authenticated layout and route guard.
- `src/components/app-nav.tsx` now provides placeholder navigation links for Recipes, New Recipe, and Import Recipe plus sign-out.
- Mock pages now exist for recipe list, recipe detail, new recipe, edit recipe, and import recipe routes.
- `src/app/page.tsx` now acts as a public landing page instead of only an auth smoke test page.
- Real recipe data loading and page-specific functionality are still pending.

---

### Task 1.5: Define recipe validation schemas

#### Objective
Ensure recipe data is validated consistently in both UI and backend logic where appropriate.

#### Requirements
Create validation rules for recipe creation and update.

#### Required fields
- `title` required
- `ingredients` must contain at least 1 item
- `instructions` must contain at least 1 step

#### Optional fields
- `description`
- `servings`
- `prep_time_minutes`
- `cook_time_minutes`

#### Validation rules
- Trim string fields.
- Reject empty titles.
- Reject blank ingredient rows.
- Reject blank instruction rows.
- Numeric fields must be nullable or valid positive numbers.

#### Acceptance criteria
- Invalid payloads are rejected by the backend.
- Error messages are usable in the frontend.
- One shared schema or equivalent validation logic is used consistently.

#### Current status
- Partially complete.
- Shared recipe input validation now exists in `src/lib/recipes/schema.ts` as `recipeInputSchema`.
- `createRecipeSchema` and `updateRecipeSchema` now reuse the same validation rules.
- The schema trims required string fields, rejects empty titles, rejects blank ingredient/instruction rows, and enforces positive integer numeric fields when provided.
- Recipe insert mapping now exists in `src/lib/recipes/mappers.ts`.
- Optional text is normalized before insert so blank descriptions are stored as `null`.
- Import-specific schema reuse is still pending.

---

### Task 1.6: Implement recipe create API

#### Objective
Allow authenticated users to create recipes manually.

#### Requirements
Create:
- `POST /api/recipes`

#### Behavior
- Require authentication.
- Validate request body.
- Set `user_id` from the authenticated session, not from client input.
- Set `source_type` to `manual`.
- Save recipe to database.
- Return the created recipe.

#### Security requirements
- Do not allow user impersonation through request payloads.
- Reject invalid request data.

#### Acceptance criteria
- Authenticated user can create a recipe.
- Unauthenticated user receives an auth error.
- Stored recipe belongs to the logged-in user.

#### Current status
- Partially complete.
- `POST /api/recipes` now exists at `src/app/api/recipes/route.ts`.
- The endpoint requires an authenticated Better Auth session.
- Request bodies are validated with `createRecipeSchema` from `src/lib/recipes/schema.ts`.
- Insert values are derived from the authenticated session via `toRecipe()` in `src/lib/recipes/mappers.ts`, so `user_id` cannot be impersonated by client payload.
- New recipes are saved with `source_type` set to `manual` and returned from the endpoint.
- UI wiring and manual end-to-end verification are still pending.

---

### Task 1.7: Implement recipe list API

#### Objective
Allow users to fetch only their own recipes.

#### Requirements
Create:
- `GET /api/recipes`

#### Behavior
- Require authentication.
- Query recipes by current `user_id` only.
- Return recipes ordered by most recently updated or created.
- Return only fields necessary for listing, unless full records are simpler and acceptable.

#### Acceptance criteria
- User sees only their own recipes.
- Endpoint does not expose other users' data.
- Response is stable and usable by the UI.

#### Current status
- Implemented.
- `GET /api/recipes` now exists at `src/app/api/recipes/route.ts`.
- The endpoint requires an authenticated Better Auth session.
- Recipes are filtered by the current user's `user_id` only.
- Results are ordered by `updated_at` descending.
- The endpoint currently returns full recipe records, which is acceptable for now and keeps the implementation simple.

---

### Task 1.8: Implement recipe detail API

#### Objective
Allow a user to view a single recipe they own.

#### Requirements
Create:
- `GET /api/recipes/:id`

#### Behavior
- Require authentication.
- Fetch recipe by `id` and current `user_id`.
- Return 404 if not found.
- Do not reveal whether another user's record exists.

#### Acceptance criteria
- Owner can fetch their recipe.
- Non-owner cannot access someone else's recipe.
- Missing recipes return a clear not-found response.

#### Current status
- Implemented.
- `GET /api/recipes/:id` now exists at `src/app/api/recipes/[id]/route.ts`.
- The endpoint requires an authenticated Better Auth session.
- Recipe lookup is scoped to both the requested `id` and the current user's `user_id`.
- Missing or non-owned recipes return `404`, so the API does not reveal whether another user's record exists.

---

### Task 1.9: Implement recipe update API

#### Objective
Allow a user to edit their recipe.

#### Requirements
Create:
- `PUT /api/recipes/:id`

#### Behavior
- Require authentication.
- Validate input.
- Ensure recipe belongs to current user.
- Update allowed fields only.
- Update `updated_at` automatically.

#### Acceptance criteria
- Owner can update a recipe.
- Invalid data is rejected.
- Non-owner cannot update another user's recipe.

#### Current status
- Implemented.
- `PUT /api/recipes/:id` now exists at `src/app/api/recipes/[id]/route.ts`.
- The endpoint requires an authenticated Better Auth session.
- Request bodies are validated with `updateRecipeSchema`.
- Updates are scoped to the current user's recipe only.
- Missing or non-owned recipes return `404`.
- `updated_at` is handled by the database schema via the Drizzle `$onUpdate` configuration.

---

### Task 1.10: Implement recipe delete API

#### Objective
Allow a user to delete their recipe.

#### Requirements
Create:
- `DELETE /api/recipes/:id`

#### Behavior
- Require authentication.
- Ensure recipe belongs to current user.
- Delete recipe safely.
- Return success response.

#### UX requirement
- Frontend should ask for delete confirmation before calling the API.

#### Acceptance criteria
- Owner can delete a recipe.
- Non-owner cannot delete another user's recipe.
- Deleted recipes no longer appear in recipe list.

#### Current status
- Implemented.
- `DELETE /api/recipes/:id` now exists at `src/app/api/recipes/[id]/route.ts`.
- The endpoint requires an authenticated Better Auth session.
- Deletes are scoped to the current user's recipe only.
- Missing or non-owned recipes return `404`.
- The endpoint returns a simple success response on deletion.

---

### Task 1.11: Build the recipe list page

#### Objective
Provide a simple homepage/dashboard for browsing saved recipes.

#### Requirements
- Show current user's recipes.
- Include recipe title and basic metadata if available.
- Provide a link to create a new recipe.
- Provide a link to each recipe detail page.

#### Empty state requirements
If user has no recipes, show:
- a friendly empty state message
- a call to action to create a recipe manually

#### Acceptance criteria
- Page loads recipes from API.
- Recipe list is readable and functional.
- Empty state works correctly.

#### Current status
- Route scaffold exists at `src/app/(app)/recipes/page.tsx`.
- The page currently renders a placeholder only; API integration and real list UI are still pending.

---

### Task 1.12: Build the new recipe page and form

#### Objective
Allow users to create recipes manually through the UI.

#### Requirements
Build a form with fields for:
- title
- description
- servings
- prep time
- cook time
- ingredients
- instructions

#### Form behavior
- User can add multiple ingredients.
- User can add multiple instruction steps.
- Basic client-side validation is helpful, but backend validation is required.
- On success, redirect user to the recipe detail page.
- Show error messages if save fails.

#### Suggested UX
- Use repeatable input rows for ingredients and instructions.
- Include buttons like “Add ingredient” and “Add step”.

#### Acceptance criteria
- User can create a valid recipe from the UI.
- Validation errors are shown clearly.
- Successful submit persists data and redirects correctly.

#### Current status
- Route scaffold exists at `src/app/(app)/recipes/new/page.tsx`.
- The page currently renders a placeholder only; the form and submit flow are still pending.

---

### Task 1.13: Build the recipe detail page

#### Objective
Show the full contents of one recipe.

#### Requirements
Display:
- title
- description
- servings
- prep time
- cook time
- ingredients list
- instructions list
- source type
- source URL if present

#### Actions
- edit button
- delete button
- back to recipes link

#### Acceptance criteria
- Recipe content displays correctly.
- User can navigate to edit flow.
- User can initiate delete flow.

#### Current status
- Route scaffold exists at `src/app/(app)/recipes/[id]/page.tsx`.
- The page currently renders a placeholder only; recipe loading and actions are still pending.

---

### Task 1.14: Build the edit recipe page and form reuse

#### Objective
Allow a user to update an existing recipe using the same general form structure as create.

#### Requirements
- Pre-fill form with existing recipe data.
- Reuse form logic/components where reasonable.
- Submit updates to the recipe update API.
- Redirect back to recipe detail after success.

#### Acceptance criteria
- Existing recipe data loads into form.
- User can edit and save changes.
- Updated data appears on detail page after save.

#### Current status
- Route scaffold exists at `src/app/(app)/recipes/[id]/edit/page.tsx`.
- The page currently renders a placeholder only; form reuse and update submission are still pending.

---

### Task 1.15: Add basic error handling for Phase 1 flows

#### Objective
Make the app understandable when something goes wrong.

#### Requirements
Handle at least these cases:
- failed Google sign-in
- canceled Google sign-in
- unauthorized page access
- recipe create/update validation failure
- recipe not found
- API/network failure

#### UI expectations
- Show clear, plain-language messages.
- Do not expose stack traces or raw server errors to users.

#### Acceptance criteria
- Main user flows fail gracefully.
- Errors are visible and actionable.

---

### Task 1.16: Manual verification checklist for Phase 1

Before marking Phase 1 complete, verify:

- User can sign in with Google.
- User can sign out.
- Logged-out user cannot access recipe routes.
- User can create a recipe manually.
- User can view recipe list.
- User can view recipe detail.
- User can edit recipe.
- User can delete recipe.
- One user cannot access another user's recipes.

---

## Phase 2: URL Import, Fetching, AI Extraction, Validation, Storage

### Phase Goal
Add the second input path so a user can paste a recipe URL and the system will:

- fetch the page
- extract recipe data
- validate the result
- save it as a recipe
- show the saved recipe to the user

This phase should remain simple and synchronous unless simplicity clearly fails.

---

### Task 2.1: Build the import recipe page

#### Objective
Provide a UI where users can paste a recipe URL for automatic import.

#### Requirements
Create a page with:
- a URL input
- an import button
- an area for loading state
- an area for errors

#### Form behavior
- Require a non-empty URL.
- Perform basic client-side format checking if helpful.
- Submit to `POST /api/recipes/import`.
- Redirect to recipe detail page on success.

#### Acceptance criteria
- User can access import page.
- User can submit a URL.
- Loading and error states are visible.

#### Current status
- Route scaffold exists at `src/app/(app)/recipes/import/page.tsx`.
- The page currently renders a placeholder only; the URL form and import UX are still pending.

---

### Task 2.2: Implement import API endpoint skeleton

#### Objective
Create the backend endpoint for the import flow before adding full extraction logic.

#### Requirements
Create:
- `POST /api/recipes/import`

#### Input
```json
{ "url": "https://..." }
```

#### Behavior
- Require authentication.
- Validate input payload.
- Accept only `http` and `https` URLs.
- Reject unsupported protocols.

#### Acceptance criteria
- Endpoint exists and validates input.
- Unauthenticated access is rejected.
- Invalid URLs return a clear error.

---

### Task 2.3: Add backend URL fetch utility with safety limits

#### Objective
Safely fetch webpage content from user-provided URLs.

#### Requirements
Build a server-side utility that:
- fetches HTML from a URL
- uses a timeout
- enforces a response size limit
- follows redirects only as needed
- returns page content for further parsing

#### Safety requirements
- Allow only `http` and `https`.
- Fail fast on invalid or unreachable URLs.
- Do not fetch local file paths or unsupported schemes.
- Keep logic simple; no headless browser.

#### Suggested output
Return an object with enough data for import processing, for example:
- final URL
- status code if useful
- raw HTML
- content type if available

#### Acceptance criteria
- Valid recipe pages can be fetched.
- Timeouts are handled.
- Oversized responses are rejected.
- Failures return controlled errors.

---

### Task 2.4: Implement JSON-LD extraction

#### Objective
Prefer structured recipe metadata from the webpage before using AI on raw content.

#### Requirements
Parse the fetched HTML and look for JSON-LD script blocks.

#### Behavior
- Find `<script type="application/ld+json">` blocks.
- Parse JSON safely.
- Support cases where JSON-LD contains arrays or nested objects.
- Look for recipe-shaped objects, especially `@type: Recipe`.
- Extract useful fields when available.

#### Fields to map if present
- title/name
- description
- servings/yield
- prep time
- cook time
- ingredients
- instructions

#### Acceptance criteria
- Recipe JSON-LD is detected when present.
- Structured data can be converted into the app recipe shape.
- Parsing failures do not crash the request.

---

### Task 2.5: Implement fallback readable content extraction

#### Objective
If JSON-LD is missing or poor quality, prepare page content that can be sent to the AI model.

#### Requirements
Create a utility that extracts the most relevant readable content from the fetched page.

#### Suggested approach
- Remove obviously irrelevant HTML if easy to do.
- Extract page title.
- Extract major text content from the body.
- Keep output smaller and more focused than the full raw HTML when possible.

#### Important note
Do not over-engineer scraping. This is a fallback only.

#### Acceptance criteria
- Fallback content is available when JSON-LD is absent.
- Content is reasonably clean for prompt input.
- Utility stays simple and maintainable.

---

### Task 2.6: Define the AI extraction schema

#### Objective
Create a strict schema for the recipe data expected back from the AI model.

#### Required fields in result schema
- `title`
- `description` nullable
- `servings` nullable
- `prep_time_minutes` nullable
- `cook_time_minutes` nullable
- `ingredients`
- `instructions`

#### Requirements
- Use a structured output approach if the AI SDK supports it.
- Ignore extra fields.
- Ensure ingredients and instructions are arrays.

#### Acceptance criteria
- Schema is explicit and reusable.
- AI result can be validated against this schema before saving.

---

### Task 2.7: Implement AI extraction service

#### Objective
Send relevant page content to the AI model and receive structured recipe data.

#### Requirements
Build a server-side service that:
- accepts prepared source content
- calls the AI model
- requests only structured recipe JSON
- returns parsed result

#### Prompt requirements
The prompt should instruct the model to return only the recipe fields defined in schema:
- title
- description
- servings
- prep time
- cook time
- ingredients
- instructions

#### Implementation requirements
- Keep the prompt simple and strict.
- Prefer JSON-LD-derived input when it exists but is incomplete or needs normalization.
- Use fallback readable content when structured page data is not enough.

#### Acceptance criteria
- AI service returns a parseable structured result.
- Response format is constrained and predictable.
- Failure cases are handled cleanly.

---

### Task 2.8: Validate extracted recipe data before saving

#### Objective
Ensure imported recipes meet the same quality bar as manually entered recipes.

#### Requirements
Validate AI output using backend schema rules.

#### Required validation
- title required
- at least 1 ingredient
- at least 1 instruction
- remove or ignore extra fields
- normalize empty strings to null where appropriate

#### Failure behavior
If validation fails:
- do not save a recipe
- return an extraction failure response
- tell user manual entry may be needed

#### Acceptance criteria
- Invalid AI output is never saved.
- Valid output is normalized into storage shape.

---

### Task 2.9: Save imported recipes

#### Objective
Persist successfully extracted recipes in the same recipe system as manual entries.

#### Requirements
When import succeeds:
- create a recipe for the current user
- set `source_type` to `url`
- store the original `source_url`
- save extracted fields
- return the created recipe record

#### Acceptance criteria
- Imported recipe is stored successfully.
- Recipe is associated with the logged-in user.
- Source URL is preserved.

---

### Task 2.10: Complete end-to-end import endpoint flow

#### Objective
Connect all import pieces into one request flow.

#### Final endpoint behavior
`POST /api/recipes/import` should:
1. authenticate user
2. validate URL input
3. fetch webpage content
4. check for recipe JSON-LD
5. use JSON-LD first when possible
6. fall back to readable content when needed
7. call AI extraction with strict schema
8. validate extracted result
9. save recipe
10. return created recipe

#### Error cases to handle
- invalid URL
- unsupported protocol
- page fetch failure
- timeout
- oversized response
- no useful recipe content
- AI failure
- validation failure

#### Acceptance criteria
- Full import flow works from a real URL.
- Failure cases return controlled messages.
- Endpoint remains readable and not overly complex.

---

### Task 2.11: Add import success and failure UX

#### Objective
Make import status understandable to the user.

#### Requirements
On the import page:
- show loading state while request is in progress
- disable repeated submission during import
- show a clear error if import fails
- redirect to detail page if import succeeds

#### User-facing error messages
Use simple messages such as:
- “Could not fetch recipe URL”
- “Could not extract recipe automatically”
- “Please try manual entry instead”

#### Acceptance criteria
- Import process gives visible feedback.
- Users understand whether they should retry or enter manually.

---

### Task 2.12: Manual verification checklist for Phase 2

Before marking Phase 2 complete, verify:

- User can paste a valid recipe URL.
- Import endpoint rejects invalid URLs.
- Import endpoint rejects unauthenticated requests.
- Page fetch works for a normal recipe URL.
- JSON-LD path works when present.
- Fallback content path works when JSON-LD is absent.
- AI extraction returns recipe data.
- Invalid AI output is not saved.
- Valid imported recipe appears in list and detail pages.
- Source URL is stored on imported recipe.

---

## Phase 3: Small Polish, Better Errors, Basic Loading States

### Phase Goal
Improve usability without adding major new features. This phase is intentionally small.

---

### Task 3.1: Improve user-facing error messages

#### Objective
Replace vague or technical errors with clear, specific guidance.

#### Requirements
Review all major flows and improve error copy for:
- Google sign-in
- sign-out
- recipe create
- recipe update
- recipe delete
- recipe load
- recipe import

#### Message guidelines
- Be plain language.
- Say what failed.
- Suggest next step if useful.
- Do not expose internal implementation details.

#### Acceptance criteria
- Common failures are understandable to a non-technical user.
- Raw server/internal errors are not shown directly.

---

### Task 3.2: Add loading states to major async actions

#### Current status
- Partially complete already.
- Google sign-in action has a loading state in `src/components/signin-button.tsx`.
- Sign-out action has a loading state in `src/components/signout-button.tsx`.
- Loading states for recipe create/edit/delete/import are still pending.

#### Objective
Make the UI feel responsive and prevent duplicate actions.

#### Required places for loading states
- Google sign-in action
- sign-out action
- new recipe form submit
- edit recipe form submit
- delete action
- recipe import submit
- initial recipe list loading if needed
- recipe detail loading if needed

#### Behavior
- Disable submit buttons while requests are pending.
- Show loading text or spinner.
- Prevent duplicate submissions.

#### Acceptance criteria
- Async actions visibly indicate progress.
- Duplicate submits are prevented.

---

### Task 3.3: Improve empty, error, and not-found states

#### Objective
Make edge-case screens usable and intentional.

#### Requirements
Review and improve:
- empty recipe list state
- missing recipe state
- unauthorized access redirect behavior
- failed import state
- generic fallback UI where needed

#### Acceptance criteria
- Important edge cases have clean UI treatment.
- User is never left on a blank or confusing screen.

---

### Task 3.4: Do a light UI polish pass only

#### Objective
Make the app clean and usable without expanding scope.

#### Requirements
Apply small improvements only, such as:
- spacing consistency
- readable form layout
- button hierarchy
- consistent headings
- mobile-friendly layout fixes

#### Non-goals
Do not add:
- design system overhaul
- animations unless trivial
- advanced theming
- new product features

#### Acceptance criteria
- App is clean, readable, and responsive enough for basic use.

---

### Task 3.5: Add basic logging around import failures and key server actions

#### Objective
Support debugging in development and simple production monitoring.

#### Requirements
Add simple server-side logs for:
- import fetch failure
- AI extraction failure
- validation failure on import
- unexpected server errors in important endpoints

#### Logging rules
- Do not log secrets.
- Do not log auth secrets, session tokens, or OAuth credentials.
- Keep logs concise but useful.

#### Acceptance criteria
- Important failures are visible in server logs.
- Logs help diagnose issues without leaking sensitive data.

---

### Task 3.6: Final end-to-end verification checklist

Before marking the project ready for initial release, verify:

#### Auth
- user can sign in with Google
- user can sign out
- auth-protected routes behave correctly

#### Manual recipe flow
- user can create recipe manually
- user can view recipe list
- user can view recipe detail
- user can edit recipe
- user can delete recipe

#### Import flow
- user can import from valid URL
- invalid URL fails clearly
- fetch failure fails clearly
- extraction failure fails clearly
- imported recipe saves correctly

#### Security
- user cannot access another user's recipes
- recipe APIs require authentication
- imported URLs are restricted to `http/https`

#### UX
- loading states appear during async actions
- errors are understandable
- empty states are helpful
- layout works on smaller screens

---

## Suggested Order of Work

If one developer is implementing from scratch, use this order:

1. project setup
2. database + Drizzle
3. authentication
4. protected layout/navigation
5. recipe validation
6. recipe CRUD APIs
7. recipe list/detail/create/edit UI
8. import page
9. URL fetch utility
10. JSON-LD extraction
11. fallback content extraction
12. AI extraction service
13. import endpoint end-to-end
14. polish and loading/error states

---

## Definition of Done

The project is done for this architecture version when:

- authenticated users can fully manage their own recipes
- recipes can be created manually
- recipes can be imported from supported URLs through AI extraction
- imported data is validated before saving
- the app handles common errors clearly
- the implementation stays within KISS and YAGNI constraints from `docs/architecture.md`
