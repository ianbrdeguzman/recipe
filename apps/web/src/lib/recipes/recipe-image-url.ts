const RECIPE_IMAGES_BUCKET = "recipe-images";

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
  );
}

export function getRecipeImagePublicUrl(
  imageKey: string | null | undefined,
) {
  if (!imageKey) {
    return null;
  }

  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${RECIPE_IMAGES_BUCKET}/${imageKey}`;
}
