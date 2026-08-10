"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const recipeMutationErrorResponseSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

const recipeMutationResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});

type FieldErrors = Partial<
  Record<
    | "title"
    | "description"
    | "servings"
    | "prepTimeMinutes"
    | "cookTimeMinutes"
    | "ingredients"
    | "instructions",
    string[]
  >
>;

type RecipeFormValues = {
  title: string;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: string[];
  instructions: string[];
};

type RecipeFormProps = {
  mode: "create" | "edit";
  recipeId?: string;
  initialValues?: Partial<RecipeFormValues>;
};

const defaultValues: RecipeFormValues = {
  title: "",
  description: null,
  servings: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  ingredients: [""],
  instructions: [""],
};

function resolveInitialValues(
  initialValues?: Partial<RecipeFormValues>,
): RecipeFormValues {
  return {
    ...defaultValues,
    ...initialValues,
    ingredients:
      initialValues?.ingredients && initialValues.ingredients.length > 0
        ? initialValues.ingredients
        : [""],
    instructions:
      initialValues?.instructions && initialValues.instructions.length > 0
        ? initialValues.instructions
        : [""],
  };
}

export function RecipeForm({ mode, recipeId, initialValues }: RecipeFormProps) {
  const router = useRouter();

  const isNewRecipe = mode === "create";
  const buttonLabel = isNewRecipe ? "Create recipe" : "Save changes";
  const cancelHref = isNewRecipe ? "/recipes" : `/recipes/${recipeId}`;

  const resolvedInitialValues = resolveInitialValues(initialValues);

  const [title, setTitle] = useState(resolvedInitialValues.title);
  const [description, setDescription] = useState(
    resolvedInitialValues.description ?? "",
  );
  const [servings, setServings] = useState(
    resolvedInitialValues.servings
      ? String(resolvedInitialValues.servings)
      : "",
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    resolvedInitialValues.prepTimeMinutes
      ? String(resolvedInitialValues.prepTimeMinutes)
      : "",
  );
  const [cookTimeMinutes, setCookTimeMinutes] = useState(
    resolvedInitialValues.cookTimeMinutes
      ? String(resolvedInitialValues.cookTimeMinutes)
      : "",
  );
  const [ingredients, setIngredients] = useState(
    resolvedInitialValues.ingredients,
  );
  const [instructions, setInstructions] = useState(
    resolvedInitialValues.instructions,
  );

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateListItem = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      index: number,
      value: string,
    ) => {
      setter((items) => items.map((item, i) => (i === index ? value : item)));
    },
    [],
  );

  const addListItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter((items) => [...items, ""]);
    },
    [],
  );

  const removeListItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
      setter((items) =>
        items.length === 1 ? items : items.filter((_, i) => i !== index),
      );
    },
    [],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isNewRecipe && !recipeId) {
      setFormError("Recipe ID is required to save changes.");
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    const endpoint = isNewRecipe ? "/api/recipes" : `/api/recipes/${recipeId}`;

    const method = isNewRecipe ? "POST" : "PUT";

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          servings: servings ? Number(servings) : null,
          prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : null,
          cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : null,
          ingredients,
          instructions,
        }),
      });
    } catch {
      setErrors({});
      setFormError("Could not save recipe.");
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const result = recipeMutationErrorResponseSchema.safeParse(data);

      if (result.success) {
        setErrors(result.data.fieldErrors ?? {});
        setFormError(result.data.error);
      } else {
        setErrors({});
        setFormError("Could not save recipe.");
      }

      setIsSubmitting(false);
      return;
    }

    const data = await response.json().catch(() => null);
    const result = recipeMutationResponseSchema.safeParse(data);

    if (!result.success) {
      setFormError("Recipe was saved, but the response was invalid.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/recipes/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-zinc-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        {errors.title ? (
          <p className="text-sm text-red-600">{errors.title[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-900"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        {errors.description ? (
          <p className="text-sm text-red-600">{errors.description[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label
            htmlFor="servings"
            className="text-sm font-medium text-zinc-900"
          >
            Servings
          </label>
          <input
            id="servings"
            name="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(event) => setServings(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="prepTimeMinutes"
            className="text-sm font-medium text-zinc-900"
          >
            Prep time
          </label>
          <input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min="1"
            value={prepTimeMinutes}
            onChange={(event) => setPrepTimeMinutes(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="cookTimeMinutes"
            className="text-sm font-medium text-zinc-900"
          >
            Cook time
          </label>
          <input
            id="cookTimeMinutes"
            name="cookTimeMinutes"
            type="number"
            min="1"
            value={cookTimeMinutes}
            onChange={(event) => setCookTimeMinutes(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {errors.servings ? (
          <p className="text-sm text-red-600">{errors.servings[0]}</p>
        ) : null}
        {errors.prepTimeMinutes ? (
          <p className="text-sm text-red-600">{errors.prepTimeMinutes[0]}</p>
        ) : null}
        {errors.cookTimeMinutes ? (
          <p className="text-sm text-red-600">{errors.cookTimeMinutes[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Ingredients</h2>
          <button
            type="button"
            onClick={() => addListItem(setIngredients)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            Add ingredient
          </button>
        </div>

        {ingredients.map((ingredient, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={ingredient}
              onChange={(event) =>
                updateListItem(setIngredients, index, event.target.value)
              }
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder={`Ingredient ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeListItem(setIngredients, index)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        {errors.ingredients ? (
          <p className="text-sm text-red-600">{errors.ingredients[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Instructions</h2>
          <button
            type="button"
            onClick={() => addListItem(setInstructions)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            Add step
          </button>
        </div>

        {instructions.map((instruction, index) => (
          <div key={index} className="flex gap-2">
            <textarea
              value={instruction}
              onChange={(event) =>
                updateListItem(setInstructions, index, event.target.value)
              }
              rows={3}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder={`Step ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeListItem(setInstructions, index)}
              className="self-start rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        {errors.instructions ? (
          <p className="text-sm text-red-600">{errors.instructions[0]}</p>
        ) : null}
      </div>

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : buttonLabel}
        </button>

        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
