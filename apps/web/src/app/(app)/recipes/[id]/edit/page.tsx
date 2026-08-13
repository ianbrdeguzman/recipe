import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RecipeForm } from "@/components/recipe-form";
import { RecipeImage } from "@/components/recipe-image";
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

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const selectedRecipe = await getRecipeForCurrentUser(id);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          Edit recipe
        </p>

        <h1 className="text-foreground text-3xl font-semibold">
          {selectedRecipe.title}
        </h1>

        <p className="text-muted-foreground max-w-2xl text-base">
          Update the recipe details, ingredients, and instructions.
        </p>

        <div>
          <Link
            href={`/recipes/${selectedRecipe.id}`}
            className="text-foreground text-sm font-medium underline underline-offset-4"
          >
            Back to recipe
          </Link>
        </div>
      </div>

      <RecipeImage
        imageKey={selectedRecipe.imageKey}
        title={selectedRecipe.title}
        variant="preview"
      />

      <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
        <RecipeForm
          mode="edit"
          recipeId={selectedRecipe.id}
          initialValues={{
            title: selectedRecipe.title,
            description: selectedRecipe.description,
            servings: selectedRecipe.servings,
            prepTimeMinutes: selectedRecipe.prepTimeMinutes,
            cookTimeMinutes: selectedRecipe.cookTimeMinutes,
            ingredients: selectedRecipe.ingredients,
            instructions: selectedRecipe.instructions,
          }}
        />
      </div>
    </section>
  );
}
