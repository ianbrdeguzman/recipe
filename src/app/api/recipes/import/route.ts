import { auth } from "@/lib/auth";
import { importRecipeSchema } from "@/lib/recipes/schema";
import { headers } from "next/headers";

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

  const result = importRecipeSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid import data",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // TODO: extract recipe
  // TODO: save recipe
  // TODO: return saved recipe

  return Response.json({ success: true }, { status: 200 });
}
