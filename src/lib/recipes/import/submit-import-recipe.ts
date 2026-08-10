import { z } from "zod";

const importRecipeErrorResponseSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

const importRecipeSuccessResponseSchema = z.object({
  id: z.string(),
});

type SubmitImportRecipeParams = {
  url: string;
};

type ImportFieldErrors = Partial<Record<"url", string[]>>;

type SubmitImportRecipeResult =
  | {
      ok: true;
      data: z.infer<typeof importRecipeSuccessResponseSchema>;
    }
  | {
      ok: false;
      error: string;
      fieldErrors: ImportFieldErrors;
    };

export async function submitImportRecipe({
  url,
}: SubmitImportRecipeParams): Promise<SubmitImportRecipeResult> {
  let response: Response;

  try {
    response = await fetch("/api/recipes/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not import recipe.",
      fieldErrors: {},
    };
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const result = importRecipeErrorResponseSchema.safeParse(data);

    if (!result.success) {
      return {
        ok: false,
        error: "Could not import recipe.",
        fieldErrors: {},
      };
    }

    return {
      ok: false,
      error: result.data.error,
      fieldErrors: result.data.fieldErrors ?? {},
    };
  }

  const data = await response.json().catch(() => null);
  const result = importRecipeSuccessResponseSchema.safeParse(data);

  if (!result.success) {
    return {
      ok: false,
      error: "Recipe was imported, but the response was invalid.",
      fieldErrors: {},
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}
