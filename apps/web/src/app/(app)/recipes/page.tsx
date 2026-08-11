import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
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
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Recipe list
          </p>
          <h1 className="text-foreground text-3xl font-semibold">Your recipes</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base">
            Browse your saved recipes or add a new one.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/recipes/new">Create recipe</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/recipes/import">Import from URL</Link>
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-card border-border rounded-2xl border border-dashed p-8">
          <h2 className="text-foreground text-xl font-semibold">No recipes yet</h2>
          <p className="text-muted-foreground mt-2">
            You haven&apos;t saved any recipes yet. Start by creating one
            manually.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/recipes/new">Create your first recipe</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4">
          {recipes.map((item) => (
            <li key={item.id}>
              <Link
                href={`/recipes/${item.id}`}
                className="bg-card border-border hover:border-ring/50 block rounded-2xl border p-5 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-foreground text-lg font-semibold">
                      {item.title}
                    </h2>

                    {item.description ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-3 py-1 text-xs font-medium">
                    {item.sourceType === "url" ? "Imported" : "Manual"}
                  </span>
                </div>

                <div className="text-muted-foreground mt-4 flex flex-wrap gap-3 text-sm">
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
