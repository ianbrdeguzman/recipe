import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { createRecipeSchema } from "@/lib/recipes/schema";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import { toRecipe } from "@/lib/recipes/mappers";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipes = await db
    .select()
    .from(recipe)
    .where(eq(recipe.userId, session.user.id))
    .orderBy(desc(recipe.updatedAt));

  return Response.json(recipes, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createRecipeSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid recipe data",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const [createdRecipe] = await db
    .insert(recipe)
    .values(toRecipe(result.data, session.user.id))
    .returning();

  return Response.json(createdRecipe, { status: 201 });
}
