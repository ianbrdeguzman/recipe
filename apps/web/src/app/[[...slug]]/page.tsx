import Link from "next/link";
import { notFound } from "next/navigation";

import { ImportRecipeForm } from "@/components/import-recipe-form";
import { reconstructUrlFromSlug } from "@/lib/recipes/import/reconstruct-url-from-slug";

export default async function CatchAllImportPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const initialUrl = reconstructUrlFromSlug(slug);

  if (!initialUrl) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          URL import
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Import this recipe
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          We reconstructed the recipe URL from the path. Review it below, then
          import it into your recipe collection.
        </p>
        <div>
          <Link
            href="/"
            className="text-foreground text-sm font-medium underline underline-offset-4"
          >
            Back to home
          </Link>
        </div>
      </div>

      <ImportRecipeForm initialUrl={initialUrl} />
    </section>
  );
}
