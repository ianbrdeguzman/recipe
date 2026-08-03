import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import { RecipeForm } from "@/components/recipe-form";

type EditRecipePageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const selectedRecipe = await getRecipeForCurrentUser(id);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Edit recipe
        </p>

        <h1 className="text-3xl font-semibold text-zinc-900">
          {selectedRecipe.title}
        </h1>

        <p className="max-w-2xl text-base text-zinc-600">
          Update the recipe details, ingredients, and instructions.
        </p>

        <div>
          <Link
            href={`/recipes/${selectedRecipe.id}`}
            className="text-sm font-medium text-zinc-700 underline underline-offset-4"
          >
            Back to recipe
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
