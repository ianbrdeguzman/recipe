# Slug Import Auto-Import Design

## Summary

Rework the catch-all slug import route so it no longer prepopulates the manual import form. When a root catch-all slug successfully reconstructs a recipe URL, the page should immediately attempt to import that recipe on the server for the authenticated user. On success, the route should redirect to the created recipe detail page. On failure, the route should render a dedicated fallback state with clear calls to action for manual import and manual recipe creation.

## Goals

- Remove the intermediate import form from the slug catch-all flow.
- Start importing immediately after a valid slug URL is reconstructed.
- Redirect to the recipe detail page after a successful import.
- Preserve existing auth behavior for unauthenticated users by redirecting to `/`.
- Preserve invalid-slug behavior by returning `notFound()`.
- Provide a route-local failure UI when the import operation throws.

## Non-Goals

- Changing the existing manual import form flow used elsewhere in the app.
- Changing `importRecipeFromUrl()` behavior or importer internals.
- Introducing resumable imports, background jobs, or progress percentages.
- Changing route handler behavior at `/api/recipes/import`.

## Current State

The current route at `apps/web/src/app/[...slug]/page.tsx`:

1. Awaits `params` and reconstructs a URL from the slug.
2. Calls `notFound()` when reconstruction fails.
3. Renders explanatory copy and `<ImportRecipeForm initialUrl={initialUrl} />` when reconstruction succeeds.

The form component then performs a client-side POST to `/api/recipes/import` via `submitImportRecipe()`, and pushes to `/recipes/[id]` after a successful response.

## Desired Behavior

### Invalid slug

If `reconstructUrlFromSlug(slug)` returns `null`, the route must call `notFound()`.

### Unauthenticated user

If the slug is valid but the current user is not authenticated, the route must redirect to `/`.

### Successful import

If the slug is valid and the user is authenticated:

1. Call `importRecipeFromUrl({ url: reconstructedUrl, userId: session.user.id })` from the server page.
2. On success, redirect to `/recipes/${createdRecipe.id}`.

### Failed import

If `importRecipeFromUrl()` throws:

1. Do not redirect.
2. Render a dedicated error state in the catch-all route segment.
3. Include copy explaining that the recipe could not be imported automatically.
4. Include a CTA to import manually.
5. Include a CTA to create a recipe manually.

## UX Design

### Loading state

Add `apps/web/src/app/[...slug]/loading.tsx` to provide an importing state while the page suspends during auth lookup and import work.

The loading UI should:

- communicate that the recipe is being imported
- feel consistent with the existing app shell and spacing
- avoid interactive controls that imply user action is needed

### Error state

The error state should be route-local and intentional rather than a generic framework error screen.

Recommended content:

- eyebrow or label: `URL import`
- heading: `We couldn't import this recipe`
- supporting text: explain that automatic import failed and the user can try another path
- CTA 1: link to `/recipes/import`
- CTA 2: link to `/recipes/new`
- optional tertiary link: back to `/recipes`

Because Next `redirect()` throws, success redirects must happen outside any `catch` branch that is intended only for import failures.

## Technical Design

### Route page changes

Update `apps/web/src/app/[...slug]/page.tsx` to:

1. await `params`
2. reconstruct the URL
3. `notFound()` on invalid slug
4. fetch the current session with the existing server-side auth pattern used elsewhere in the app
5. `redirect("/")` if the user is missing
6. attempt `importRecipeFromUrl({ url, userId })`
7. `redirect(`/recipes/${createdRecipe.id}`)` on success
8. catch import errors and render the dedicated fallback UI

This page should become fully server-driven. It should no longer render `ImportRecipeForm`.

### Auth pattern

Use the same auth pattern already present in app-router server components:

- `auth.api.getSession({ headers: await headers() })`
- `redirect("/")` when `session?.user` is absent

This keeps behavior aligned with `apps/web/src/app/(app)/layout.tsx`.

### Error handling strategy

Use a local `try/catch` around the import call inside the page rather than relying on `error.tsx`.

Reasoning:

- the user explicitly wants a purpose-built failure state for this route
- framework error boundaries receive production-sanitized server errors, which is useful for generic failure handling but unnecessary here
- local rendering keeps the route behavior explicit and easy to test

The `catch` block should not swallow `notFound()` or auth redirects, because those happen before the import attempt.

### Loading strategy

Use `loading.tsx` in the same segment to show an importing state while the page is suspended.

This aligns with Next App Router guidance for route-level loading UI. The route currently has no dedicated loading file, so adding one provides a smoother transition during import work.

## Component and File Impact

### Files to update

- `apps/web/src/app/[...slug]/page.tsx`

### Files to add

- `apps/web/src/app/[...slug]/loading.tsx`

### Existing files unaffected by this route after the change

- `apps/web/src/components/import-recipe-form.tsx` remains in the codebase for manual flows, but should no longer be imported by the catch-all route.

## Routing and CTA Decisions

### Manual import CTA

Destination: `/recipes/import`

This change does not add query-string prefill or other state handoff into the manual import flow.

### Manual creation CTA

Destination: `/recipes/new`

Use the existing manual recipe creation route rather than introducing a new path.

## Testing Design

Add or update route tests to cover:

1. invalid slug -> `notFound()`
2. missing session -> redirect to `/`
3. successful import -> redirect to `/recipes/[id]`
4. import failure -> renders the dedicated fallback UI
5. import failure UI includes both required CTAs

Test doubles should mock:

- `reconstructUrlFromSlug`
- session lookup via auth
- `importRecipeFromUrl`
- `redirect` / `notFound` behaviors as needed by the existing route test style

## Risks and Mitigations

### Risk: redirect swallowed by catch

`redirect()` throws in App Router. If placed inside a broad `try/catch`, a successful redirect could be accidentally handled as an error.

Mitigation:

- keep the redirect after a successful awaited import result and outside the `catch` path used for import failures
- scope the `try/catch` carefully to the import call and success path

### Risk: loading UI not appearing immediately

Route-level `loading.tsx` depends on where suspension happens and on parent layout behavior.

Mitigation:

- keep the uncached work in the page, not moved upward into layout
- use a lightweight route-level loading component only for this segment

### Risk: redirect swallowed by catch after future edits

A later refactor could accidentally broaden the `try/catch` and convert success redirects into error UI.

Mitigation:

- keep a route test that asserts successful import redirects to `/recipes/[id]`
- keep the redirect statement outside the failure-render branch

## Acceptance Criteria

- Visiting a valid slug-import URL while signed in no longer shows an import form.
- Visiting a valid slug-import URL while signed in begins importing immediately.
- A successful import redirects to `/recipes/[id]` for the created or reused user recipe.
- A failed import shows a dedicated fallback UI with manual import and manual creation CTAs.
- Visiting a valid slug-import URL while signed out redirects to `/`.
- Visiting an invalid slug-import URL returns the route not-found experience.
- The route has a dedicated loading UI while import work is in progress.

## Implementation Notes

- Follow the existing Next 16 App Router conventions used elsewhere in this repo.
- Keep the change scoped to the slug catch-all route behavior and its direct tests.
- Do not remove the generic manual import infrastructure unless it is proven unused by all flows.
