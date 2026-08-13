# Recipe Import Image Storage Design

## Goal

Persist imported recipe images in Supabase Storage as WebP while keeping the original upstream image URL for provenance.

## Decisions

- Keep `imageUrl` meaning the original remote image URL.
- Add nullable `imageKey` to `imported_recipe` and `recipe`.
- Use public Supabase bucket `recipe-images`.
- Imported image path format: `imported/<importedRecipeId>.webp`.
- Future manual upload path format: `user/<userId>/<recipeId>.webp`.
- Client rendering should derive the public URL from `imageKey` instead of persisting the full Supabase URL.
- Image processing failures must not fail recipe import. In those cases, the recipe is still stored with `imageKey = null`.

## Architecture

### Data model

Add `imageKey` columns to both canonical and user recipe tables.

- `imported_recipe.imageUrl`: original remote URL
- `imported_recipe.imageKey`: canonical Supabase object key
- `recipe.imageUrl`: copied original remote URL
- `recipe.imageKey`: copied Supabase object key

This keeps provenance and display concerns separate while preserving cached canonical image reuse.

### Import flow

On canonical cache miss:

1. Import recipe content from the upstream URL.
2. Insert canonical row first to obtain `importedRecipeId`.
3. If `input.imageUrl` is present, attempt to:
   - download the image
   - convert it to WebP
   - upload it to `recipe-images/imported/<importedRecipeId>.webp`
   - update canonical `imageKey`
4. Create the user-owned recipe row from the canonical row, copying both `imageUrl` and `imageKey`.

On user cache hit or canonical cache hit, no image reprocessing occurs.

### Storage integration

Use server-side helpers for:

- downloading upstream images
- converting them to WebP
- uploading to Supabase Storage with service-role credentials
- building public URLs from keys for client/server rendering

The public URL format is derived at read/render time, not stored in the database.

### Error handling

Image download, conversion, and upload are best-effort. Failures should be caught, optionally logged, and must not change the successful recipe import path.

### Testing

Cover:

- canonical import success with `imageKey`
- canonical import success when image processing fails and `imageKey` remains `null`
- user clone path preserves `imageKey`
- persistence helpers write `imageKey`
- public URL helper derives the expected Supabase URL
