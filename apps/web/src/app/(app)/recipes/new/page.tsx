import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Manual entry
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Create a new recipe
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          Add a recipe manually with ingredients, instructions, and optional
          details like servings and cooking time.
        </p>
        <div>
          <Link
            href="/recipes"
            className="text-sm font-medium text-zinc-700 underline underline-offset-4"
          >
            Back to recipes
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <RecipeForm mode="create" />
      </div>
    </section>
  );
}
