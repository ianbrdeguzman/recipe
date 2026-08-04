import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";

async function getRecipeForCurrentUser(recipeId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  const [selectedRecipe] = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, session.user.id)));

  if (!selectedRecipe) {
    notFound();
  }

  return selectedRecipe;
}

export default async function RecipeDetailPage({
  params,
}: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const selectedRecipe = await getRecipeForCurrentUser(id);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/recipes"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Back to recipes
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {selectedRecipe.sourceType === "url" ? "Imported" : "Manual"}
            </span>

            {selectedRecipe.servings ? (
              <span className="text-sm text-zinc-500">
                Serves {selectedRecipe.servings}
              </span>
            ) : null}

            {selectedRecipe.prepTimeMinutes ? (
              <span className="text-sm text-zinc-500">
                Prep {selectedRecipe.prepTimeMinutes} min
              </span>
            ) : null}

            {selectedRecipe.cookTimeMinutes ? (
              <span className="text-sm text-zinc-500">
                Cook {selectedRecipe.cookTimeMinutes} min
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-zinc-900">
            {selectedRecipe.title}
          </h1>

          {selectedRecipe.description ? (
            <p className="mt-3 max-w-2xl text-base text-zinc-600">
              {selectedRecipe.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/recipes/${selectedRecipe.id}/edit`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Edit recipe
          </Link>

          <DeleteRecipeButton recipeId={selectedRecipe.id} />
        </div>
      </div>

      {selectedRecipe.sourceUrl ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Source
          </h2>
          <a
            href={selectedRecipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-sm text-zinc-900 underline underline-offset-4"
          >
            {selectedRecipe.sourceUrl}
          </a>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-900">Ingredients</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
            {selectedRecipe.ingredients.map((ingredient, index) => (
              <li key={`${selectedRecipe.id}-ingredient-${index}`}>
                {ingredient}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-900">Instructions</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-zinc-700">
            {selectedRecipe.instructions.map((instruction, index) => (
              <li key={`${selectedRecipe.id}-instruction-${index}`}>
                {instruction}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
