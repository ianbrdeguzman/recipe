import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";

async function getRecipesForCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  return db
    .select({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      sourceType: recipe.sourceType,
      updatedAt: recipe.updatedAt,
    })
    .from(recipe)
    .where(eq(recipe.userId, session.user.id))
    .orderBy(desc(recipe.updatedAt));
}

export default async function RecipesPage() {
  const recipes = await getRecipesForCurrentUser();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Recipe list
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">Your recipes</h1>
          <p className="mt-2 max-w-2xl text-base text-zinc-600">
            Browse your saved recipes or add a new one.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/recipes/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create recipe
          </Link>
          <Link
            href="/recipes/import"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
          >
            Import from URL
          </Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8">
          <h2 className="text-xl font-semibold text-zinc-900">
            No recipes yet
          </h2>
          <p className="mt-2 text-zinc-600">
            You haven&apos;t saved any recipes yet. Start by creating one
            manually.
          </p>
          <div className="mt-6">
            <Link
              href="/recipes/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Create your first recipe
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4">
          {recipes.map((item) => (
            <li key={item.id}>
              <Link
                href={`/recipes/${item.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {item.title}
                    </h2>

                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {item.sourceType === "url" ? "Imported" : "Manual"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
                  {item.servings ? <span>Serves {item.servings}</span> : null}
                  {item.prepTimeMinutes ? (
                    <span>Prep {item.prepTimeMinutes} min</span>
                  ) : null}
                  {item.cookTimeMinutes ? (
                    <span>Cook {item.cookTimeMinutes} min</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
