import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { importRecipeFromUrl } from "@/lib/recipes/import/import-recipe-from-url";
import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

export default async function CatchAllImportPage({
  params,
}: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const url = reconstructUrlFromSlug(slug);

  if (!url) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  const createdRecipe = await importRecipeFromUrl({
    url,
    userId: session.user.id,
  });

  if (createdRecipe === null) {
    throw new Error("Something went wrong.");
  }

  redirect(`/recipes/${createdRecipe.id}`);
}
