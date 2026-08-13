import sharp from "sharp";

const RECIPE_IMAGES_BUCKET = "recipe-images";

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
  );
}

function getImportedRecipeImageKey(importedRecipeId: string) {
  return `imported/${importedRecipeId}.webp`;
}

async function downloadRemoteImage(imageUrl: string) {
  const response = await fetch(imageUrl, { redirect: "follow" });

  if (!response.ok) {
    return null;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function convertImageToWebp(bytes: Buffer) {
  return sharp(bytes).webp().toBuffer();
}

async function uploadImageToSupabase({
  imageKey,
  image,
}: {
  imageKey: string;
  image: Buffer;
}) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${RECIPE_IMAGES_BUCKET}/${imageKey}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "content-type": "image/webp",
        "x-upsert": "true",
      },
      body: new Uint8Array(image),
    },
  );

  return response.ok;
}

export async function storeImportedRecipeImage({
  importedRecipeId,
  imageUrl,
}: {
  importedRecipeId: string;
  imageUrl: string;
}) {
  try {
    const downloadedImage = await downloadRemoteImage(imageUrl);

    if (!downloadedImage) {
      return null;
    }

    const webpImage = await convertImageToWebp(downloadedImage);
    const imageKey = getImportedRecipeImageKey(importedRecipeId);
    const uploaded = await uploadImageToSupabase({
      imageKey,
      image: webpImage,
    });

    return uploaded ? imageKey : null;
  } catch {
    return null;
  }
}
