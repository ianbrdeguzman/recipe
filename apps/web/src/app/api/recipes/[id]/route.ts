import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipe } from "@/lib/db/schema";
import { updateRecipeSchema } from "@/lib/recipes/schema";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/recipes/[id]">,
) {
  const { id: recipeId } = await ctx.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [selectedRecipe] = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.userId, session.user.id), eq(recipe.id, recipeId)));

  if (!selectedRecipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  return Response.json(selectedRecipe, { status: 200 });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/recipes/[id]">,
) {
  const { id: recipeId } = await ctx.params;
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

  const result = updateRecipeSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid recipe data",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      {
        status: 400,
      },
    );
  }

  const updateValues = {
    title: result.data.title.trim(),
    description: result.data.description?.trim() || null,
    servings: result.data.servings ?? null,
    prepTimeMinutes: result.data.prepTimeMinutes ?? null,
    cookTimeMinutes: result.data.cookTimeMinutes ?? null,
    ingredients: result.data.ingredients.map((ingredient) => ingredient.trim()),
    instructions: result.data.instructions.map((instruction) =>
      instruction.trim(),
    ),
  };

  const [updatedRecipe] = await db
    .update(recipe)
    .set(updateValues)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, session.user.id)))
    .returning();

  if (!updatedRecipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  return Response.json(updatedRecipe, { status: 200 });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/recipes/[id]">,
) {
  const { id: recipeId } = await ctx.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deletedRecipe] = await db
    .delete(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, session.user.id)))
    .returning({ id: recipe.id });

  if (!deletedRecipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  return Response.json({ success: true }, { status: 200 });
}
