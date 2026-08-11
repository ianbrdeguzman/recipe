import Link from "next/link";

import { ImportRecipeForm } from "@/components/import-recipe-form";

export default function ImportRecipePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          URL import
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Import a recipe
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          Paste a recipe URL and we&apos;ll try to extract the ingredients,
          instructions, and basic details automatically.
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

      <ImportRecipeForm />

      <div className="text-muted-foreground flex flex-col gap-2 text-sm">
        <p>
          Import works best with pages that clearly include ingredients and
          instructions.
        </p>
        <p>
          Having trouble? You can{" "}
          <Link
            href="/recipes/new"
            className="text-foreground font-medium underline underline-offset-4"
          >
            create a recipe manually
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
