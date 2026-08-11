import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          Manual entry
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Create a new recipe
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          Add a recipe manually with ingredients, instructions, and optional
          details like servings and cooking time.
        </p>
        <div>
          <Link
            href="/recipes"
            className="text-foreground text-sm font-medium underline underline-offset-4"
          >
            Back to recipes
          </Link>
        </div>
      </div>

      <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
        <RecipeForm mode="create" />
      </div>
    </section>
  );
}
