import Link from "next/link";
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

  let createdRecipe: { id: string };

  try {
    createdRecipe = await importRecipeFromUrl({
      url,
      userId: session.user.id,
    });
  } catch {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            URL import
          </p>
          <h1 className="text-foreground text-3xl font-semibold">
            We couldn&apos;t import this recipe
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            Automatic import failed for this URL. You can try importing it
            manually or create the recipe yourself.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/recipes/import"
            className="bg-foreground text-background inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Import recipe manually
          </Link>
          <Link
            href="/recipes/new"
            className="border-border text-foreground inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Create recipe manually
          </Link>
        </div>
      </section>
    );
  }

  redirect(`/recipes/${createdRecipe.id}`);
}
