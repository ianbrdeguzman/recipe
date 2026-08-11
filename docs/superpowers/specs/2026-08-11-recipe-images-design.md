# Recipe Images Design

## Summary
Add nullable recipe image support for both canonical imported recipes and user recipe rows. Images will be stored in the Supabase Storage `recipe` bucket as WebP files, while the database stores only the storage key/path.

## Goals
- Add an optional image to every `imported_recipe` and `recipe` row.
- Allow manual recipe creation and editing with image upload.
- Extract and persist recipe images during URL import.
- Convert both uploaded and imported images to WebP before storage.
- Render recipe thumbnails/details from stored images.
- Delete manual recipe images when replaced, cleared, or when the recipe is deleted.

## Non-Goals
- Versioning old images.
- Supporting manual image-by-URL entry.
- Deleting shared imported canonical images when user recipes are deleted.
- Backfilling existing recipes with images.

## Data Model
### Database
Update `apps/web/src/lib/db/schema.ts`:
- Add nullable `image: text("image")` to `imported_recipe`.
- Add nullable `image: text("image")` to `recipe`.

`image` stores the Supabase Storage key/path, not a public URL.

### Storage layout
Bucket: `recipe`

Manual recipe uploads:
- `users/<userId>/recipes/<recipeId>/<random>.webp`

Canonical imported images:
- `imports/<importedRecipeId>.webp`

This keeps manual assets user-owned and imported assets shared across all user copies of the same canonical import.

## Manual Upload Flow
### New upload endpoint
Add a dedicated authenticated API endpoint for manual recipe image uploads.

Responsibilities:
- Accept `multipart/form-data` with a single image file.
- Validate auth.
- Validate file exists and is an allowed image type.
- Enforce a size limit.
- Convert image to WebP server-side.
- Upload to Supabase Storage bucket `recipe`.
- Return `{ key }`.

Recommended request shape:
- `file`: uploaded file
- `recipeId` optional for create flow pre-assignment only if needed by implementation

Recommended response shape:
- success: `{ key: string }`
- failure: `{ error: string }` with appropriate status

### Form behavior
`RecipeForm` will support:
- Selecting a local file.
- Previewing the current image if present.
- Uploading the selected file before create/update submit.
- Including returned `image` key in the recipe payload.
- Clearing an existing image.
- Replacing an existing image.

Behavior:
- New recipe: upload first, then submit recipe with returned key.
- Edit recipe replace: upload new file first, save recipe with new key, then delete old manual object.
- Edit recipe clear: set `image` to `null`, then delete old manual object.

## Import Flow
### Extraction
The import pipeline should extract a candidate recipe image URL from the source when available.

Preferred sources in order:
1. Recipe JSON-LD image field
2. Other metadata-derived recipe image fields already available from page parsing
3. No image if nothing trustworthy is present

### Persistence
When importing a new canonical recipe:
- Download the extracted remote image.
- Convert it to WebP server-side.
- Upload it to `recipe` bucket at `imports/<importedRecipeId>.webp`.
- Store that key in `imported_recipe.image`.
- When creating the user-owned `recipe` copy, copy the same key to `recipe.image`.

Reuse policy:
- If an `imported_recipe` already exists for the normalized URL, reuse its stored image key exactly as-is.
- Do not refetch or replace the canonical imported image for later imports of the same normalized URL.

Failure policy:
- If image extraction/download/conversion/upload fails, recipe import should still succeed with `image = null` unless a stricter existing import contract prevents partial success.

## API Changes
### Recipe create/update
Extend recipe input schemas and handlers to accept:
- `image: string | null | undefined`

Create and update handlers should:
- Persist the provided image key.
- Continue accepting omitted image values.
- Trim text fields as before.

### Recipe delete
When deleting a user recipe:
- Load the recipe first.
- If it has a manual image key under `users/`, delete that object from Supabase Storage.
- Delete the recipe row.
- If the image key is under `imports/`, do not delete the storage object.

Delete order requirement:
- Prefer deleting the DB row only after confirming storage cleanup behavior is handled deterministically, or handle storage deletion failure explicitly and return an error instead of silently orphaning state.
- Imported shared images must never be deleted from single-user recipe deletion.

## Rendering
### URL helper
Add a helper that converts a storage key into a renderable Supabase public URL.

Responsibilities:
- Return `null` when key is null.
- Generate stable public URLs for the `recipe` bucket.
- Centralize bucket/path logic.

### Pages
Update:
- `apps/web/src/app/(app)/recipes/page.tsx` to show a thumbnail on each recipe card.
- `apps/web/src/app/(app)/recipes/[id]/page.tsx` to show the main recipe image.
- `apps/web/src/app/(app)/recipes/new/page.tsx` via `RecipeForm` support for selecting an image.
- `apps/web/src/app/(app)/recipes/[id]/edit/page.tsx` via `RecipeForm` support for replacing/clearing image.

Rendering behavior:
- Show image only when an image key exists.
- Keep layouts graceful when no image exists.
- Use `next/image` if compatible with the existing setup and configured remote host rules for Supabase storage URLs.

## Supabase Integration
Add or reuse a server-side Supabase client suitable for Storage operations.

Required capabilities:
- Upload object
- Remove object
- Generate public URL

Environment/config requirements:
- Supabase URL
- Supabase service-capable credentials for server-side storage writes/deletes
- Any client-safe public URL/config needed for rendering

## Image Processing
Use server-side image processing to convert all stored recipe images to WebP.

Requirements:
- Manual uploads are converted before upload.
- Imported remote images are converted before upload.
- Output content type should be `image/webp`.
- Filenames/keys should end with `.webp`.

Validation requirements:
- Reject non-image uploads.
- Enforce a max file size.
- Handle corrupt/unreadable image files.

## File Responsibilities
Expected touched areas:
- `apps/web/src/lib/db/schema.ts` — add image columns
- `apps/web/src/lib/recipes/schema.ts` — accept nullable image
- `apps/web/src/lib/recipes/mappers.ts` — map image into recipe inserts
- `apps/web/src/lib/recipes/import/types.ts` — include extracted image information if needed
- `apps/web/src/lib/recipes/import/extract-recipe-from-json-ld.ts` — read recipe image field
- `apps/web/src/lib/recipes/import/importers/webpage-importer.ts` — propagate image URL
- `apps/web/src/lib/recipes/import/import-recipe-from-url.ts` — upload extracted image for new canonical imports
- `apps/web/src/lib/recipes/import/imported-recipe-store.ts` — persist image on imported/user recipe rows
- `apps/web/src/app/api/recipes/route.ts` — accept image on create
- `apps/web/src/app/api/recipes/[id]/route.ts` — accept image on update and delete manual storage object on delete
- `apps/web/src/app/api/recipes/import/route.ts` — keep import contract aligned
- `apps/web/src/components/recipe-form.tsx` — upload/select/preview/clear image
- `apps/web/src/app/(app)/recipes/page.tsx` — render thumbnail
- `apps/web/src/app/(app)/recipes/[id]/page.tsx` — render main image
- `apps/web/src/app/(app)/recipes/[id]/edit/page.tsx` — pass initial image
- `apps/web/src/app/(app)/recipes/new/page.tsx` — no structural change beyond form capability
- `apps/web/next.config.ts` — allow Supabase image host if required by `next/image`
- new storage/image helpers under `apps/web/src/lib/...`
- new upload API route under `apps/web/src/app/api/...`

## Error Handling
Manual upload errors:
- 401 unauthorized
- 400 missing file / invalid type / invalid form data
- 413 file too large if implemented at route level
- 422 unreadable image
- 500 conversion/upload failure

Import image errors:
- Extraction failure => continue with `image = null`
- Remote fetch failure => continue with `image = null`
- Conversion/upload failure => continue with `image = null`

Delete/replace errors:
- Replacing image must not delete old manual image until the new upload and recipe update succeed.
- Clearing or deleting a recipe should surface storage deletion failures rather than falsely claiming full success.

## Testing
Add/extend tests for:
- schema validation accepts nullable image
- create recipe API persists image
- update recipe API persists, replaces, and clears image values
- delete recipe API deletes manual `users/` storage object and preserves `imports/` objects
- import route/service stores extracted image for newly imported canonical recipes
- import reuse path preserves existing canonical image key
- upload route validates file presence/type and returns storage key
- image conversion/upload helper error cases

## Migration/Operational Notes
- Apply a Drizzle schema push/migration for the new nullable columns.
- Configure Supabase bucket `recipe` and required permissions.
- Ensure rendering host config matches the deployed Supabase storage domain.

## Success Criteria
- Manual recipes can be created and edited with optional uploaded images.
- Imported recipes capture and store recipe images when available.
- All stored recipe images are WebP files in Supabase Storage.
- Recipe list shows thumbnails.
- Recipe detail shows main image.
- Deleting or replacing a manual image cleans up the old storage object.
- Shared imported images are reused and not deleted by individual user recipe deletion.
