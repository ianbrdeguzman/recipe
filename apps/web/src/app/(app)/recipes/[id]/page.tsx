import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { RecipeImage } from "@/components/recipe-image";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";

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
            className="text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            ← Back to recipes
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium">
              {selectedRecipe.sourceType === "url" ? "Imported" : "Manual"}
            </span>

            {selectedRecipe.servings ? (
              <span className="text-muted-foreground text-sm">
                Serves {selectedRecipe.servings}
              </span>
            ) : null}

            {selectedRecipe.prepTimeMinutes ? (
              <span className="text-muted-foreground text-sm">
                Prep {selectedRecipe.prepTimeMinutes} min
              </span>
            ) : null}

            {selectedRecipe.cookTimeMinutes ? (
              <span className="text-muted-foreground text-sm">
                Cook {selectedRecipe.cookTimeMinutes} min
              </span>
            ) : null}
          </div>

          <h1 className="text-foreground mt-4 text-3xl font-semibold">
            {selectedRecipe.title}
          </h1>

          {selectedRecipe.description ? (
            <p className="text-muted-foreground mt-3 max-w-2xl text-base">
              {selectedRecipe.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/recipes/${selectedRecipe.id}/edit`}>Edit recipe</Link>
          </Button>

          <DeleteRecipeButton recipeId={selectedRecipe.id} />
        </div>
      </div>

      <RecipeImage
        imageKey={selectedRecipe.imageKey}
        title={selectedRecipe.title}
        variant="hero"
      />

      {selectedRecipe.sourceUrl ? (
        <div className="bg-card border-border rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
            Source
          </h2>
          <a
            href={selectedRecipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground mt-2 block break-all text-sm underline underline-offset-4"
          >
            {selectedRecipe.sourceUrl}
          </a>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="text-foreground text-xl font-semibold">Ingredients</h2>
          <ul className="text-foreground mt-4 list-disc space-y-2 pl-5 text-sm">
            {selectedRecipe.ingredients.map((ingredient, index) => (
              <li key={`${selectedRecipe.id}-ingredient-${index}`}>
                {ingredient}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card border-border rounded-2xl border p-6">
          <h2 className="text-foreground text-xl font-semibold">
            Instructions
          </h2>
          <ol className="text-foreground mt-4 list-decimal space-y-3 pl-5 text-sm">
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
