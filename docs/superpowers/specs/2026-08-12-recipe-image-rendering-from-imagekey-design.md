# Recipe Image Rendering From `imageKey` Design

## Goal

Render recipe images from the persisted `imageKey` in the recipe list, recipe detail, and recipe edit pages.

## Decisions

- Reuse the existing `getRecipeImagePublicUrl(imageKey)` helper.
- Add one shared presentational component for recipe image rendering.
- Render nothing when `imageKey` is `null` or cannot be converted to a public URL.
- Keep the current data model unchanged.
- Keep edit behavior unchanged; the edit page only shows a read-only preview.

## Architecture

### Shared component

Create a small server-safe component that:

- accepts `imageKey`, `title`, and a display variant
- derives the public URL via `getRecipeImagePublicUrl(imageKey)`
- returns `null` when no URL is available
- renders `next/image` with fixed layout rules appropriate for each variant

Initial variants:

- `thumbnail` for the recipes list card
- `hero` for the recipe detail page
- `preview` for the edit page

This keeps URL derivation and image rendering behavior in one place.

### Recipes list page

Extend the list query to select `imageKey`.

Render a compact thumbnail in each recipe card when available. The card layout should continue to work when no image exists.

### Recipe detail page

Render a larger image near the top of the page, above the main recipe content. The page keeps all current metadata and actions.

### Recipe edit page

Render a read-only image preview above the form when available. No upload, remove, or replace controls are added.

## Next.js constraints

Use `next/image` for rendering. Because the source URL is remote and derived from Supabase Storage, the app must allow the Supabase host in `next.config.ts` via strict `images.remotePatterns`.

The image component should prefer `fill` with a relatively positioned wrapper and `sizes` so layout remains stable without knowing the upstream image dimensions.

## Error handling

- Missing `imageKey`: render no image.
- Missing Supabase URL env needed for public URL derivation: render no image.
- Broken remote asset: let the browser fail naturally; no extra client state is introduced in this change.

## Testing

- Add a focused test for the shared image component helper behavior if practical.
- Run targeted tests covering any touched files.
- Run `pnpm typecheck` after the change.

## Scope exclusions

- No image upload or replacement UI.
- No fallback placeholders.
- No schema or API changes.
- No changes to recipe import behavior.
