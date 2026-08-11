# Root URL Catch-All Landing Route Design

## Summary

Add a root-level optional catch-all App Router page so the web app can accept URL-shaped paths such as `/https://cafedelites.com/best-fluffy-pancakes/`, reconstruct the original external URL, and feed that value into the landing/import experience.

This must preserve the existing route behavior:

- `/` renders the marketing page
- `/recipes` continues to render the authenticated recipes app
- `/api/*` continues to render API routes
- URL-shaped unknown paths are handled by the new landing catch-all page

Validation of the reconstructed URL remains in `apps/web/src/app/api/recipes/import/route.ts` and the existing import schema/path.

## Goals

- Accept root-level URL-shaped paths without changing the desired URL format.
- Reconstruct `https://...` style URLs from Next.js catch-all route params.
- Reuse the existing landing/import flow instead of introducing a parallel import mechanism.
- Keep existing App Router routes working without rewrites or middleware.

## Non-Goals

- Moving validation out of the existing import API route.
- Adding middleware, proxy rewrites, or a custom server.
- Supporting additional encoded URL formats beyond the plain path-segment form.
- Changing `/recipes` or `/api/*` route structure.

## Next.js Constraints

Relevant Next.js 16 App Router behavior from the bundled docs:

- Use `[[...slug]]` for an optional catch-all route that matches nested paths while leaving `/` available to `app/page.tsx`.
- Route `params` are asynchronous in Next.js 16 and must be awaited.
- Static routes take precedence over dynamic routes, so existing routes like `/recipes` and `/api/*` remain intact when a root catch-all is added.

## Proposed Route Structure

Keep:

- `apps/web/src/app/page.tsx` for `/`
- `apps/web/src/app/(app)/recipes/...` for recipe routes
- `apps/web/src/app/api/...` for API routes

Add:

- `apps/web/src/app/[[...slug]]/page.tsx`

This new page is responsible only for:

1. Reading `await params`
2. Reconstructing the external URL from `slug?: string[]`
3. Rendering the landing/import experience with the reconstructed URL prefilled or otherwise supplied to the page UI
4. Falling back safely when the slug cannot be converted into a usable URL

## URL Reconstruction Rules

Input route example:

- `/https://cafedelites.com/best-fluffy-pancakes/`

Expected `params.slug` shape:

- `['https:', 'cafedelites.com', 'best-fluffy-pancakes']`

Reconstruction behavior:

1. Require at least two segments.
2. Treat the first segment as the scheme token (`http:` or `https:`).
3. Rebuild the URL as:
   - `${scheme}//${hostAndPath.join('/')}`
4. Do not preserve a trailing slash in the final reconstructed value.

Examples:

- `['https:', 'cafedelites.com']` → `https://cafedelites.com`
- `['https:', 'cafedelites.com', 'best-fluffy-pancakes']` → `https://cafedelites.com/best-fluffy-pancakes`
- malformed values return `null`

A malformed slug includes:

- missing slug array
- fewer than two segments
- a first segment other than `http:` or `https:`
- empty host segment

## UI Behavior

### `/`

`apps/web/src/app/page.tsx` remains the public marketing page.

### URL-shaped catch-all route

The new catch-all page should render the same landing/import experience family as the marketing page, but with the reconstructed URL already available to the import UI so the user can immediately import that recipe.

The page should not bypass auth or validation. It should continue to rely on the existing client-side import submission path and existing server-side import API validation.

### Invalid catch-all values

If reconstruction fails, the catch-all page should render `notFound()` instead of inventing ambiguous fallback behavior. This keeps non-URL garbage paths from silently behaving like valid imports.

## Code Organization

Introduce a small pure helper for reconstruction so the parsing logic is testable outside the route component.

Suggested responsibilities:

- `apps/web/src/app/[[...slug]]/page.tsx`
  - route component
  - awaits params
  - calls helper
  - triggers `notFound()` for invalid slugs
  - renders landing/import UI with the reconstructed URL

- `apps/web/src/lib/recipes/import/reconstruct-url-from-slug.ts`
  - pure function that accepts `string[] | undefined`
  - returns `string | null`

- `apps/web/src/lib/recipes/import/reconstruct-url-from-slug.test.ts`
  - unit tests for valid and invalid reconstruction cases

If needed, the landing/import UI may also be factored into a shared component so `/` and the catch-all page can reuse the same visual shell without duplicating markup.

## Error Handling

- Invalid catch-all params: `notFound()`
- Valid-looking reconstructed URL: pass through to existing import flow
- Actual URL validity and importability: handled by existing import schema and API route

This keeps the catch-all route focused on path decoding, not business validation.

## Testing Strategy

Add focused unit tests for the reconstruction helper covering:

- root domain only
- root domain plus path
- nested path segments
- trailing slash behavior
- invalid scheme
- missing host
- too few segments
- undefined slug

No middleware or integration routing tests are required for the initial change unless the existing test setup already supports route-level rendering economically.

## Risks and Mitigations

### Risk: root catch-all accidentally shadows existing routes
Mitigation: rely on App Router route precedence and keep static routes unchanged.

### Risk: malformed path values produce surprising imports
Mitigation: keep reconstruction strict and use `notFound()` on invalid shapes.

### Risk: duplicated landing UI between `/` and catch-all
Mitigation: extract a shared landing/import presentation component if duplication appears during implementation.

## Acceptance Criteria

- Visiting `/` still shows the marketing page.
- Visiting `/recipes` still reaches the recipes app.
- Visiting `/api/*` still reaches existing API routes.
- Visiting `/https://cafedelites.com/best-fluffy-pancakes/` reconstructs `https://cafedelites.com/best-fluffy-pancakes`.
- The reconstructed URL is passed into the landing/import flow.
- Invalid catch-all paths render not found.
- Reconstruction logic is covered by automated tests.
