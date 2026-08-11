"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
        <Label htmlFor="title" className="text-foreground">
          Title
        </Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        {errors.title ? (
          <p className="text-sm text-red-600">{errors.title[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description" className="text-foreground">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
        {errors.description ? (
          <p className="text-sm text-red-600">{errors.description[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="servings" className="text-foreground">
            Servings
          </Label>
          <Input
            id="servings"
            name="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(event) => setServings(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prepTimeMinutes" className="text-foreground">
            Prep time
          </Label>
          <Input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min="1"
            value={prepTimeMinutes}
            onChange={(event) => setPrepTimeMinutes(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cookTimeMinutes" className="text-foreground">
            Cook time
          </Label>
          <Input
            id="cookTimeMinutes"
            name="cookTimeMinutes"
            type="number"
            min="1"
            value={cookTimeMinutes}
            onChange={(event) => setCookTimeMinutes(event.target.value)}
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-foreground text-lg font-semibold">Ingredients</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => addListItem(setIngredients)}
          >
            Add ingredient
          </Button>
        </div>

        {ingredients.map((ingredient, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={ingredient}
              onChange={(event) =>
                updateListItem(setIngredients, index, event.target.value)
              }
              className="flex-1"
              placeholder={`Ingredient ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => removeListItem(setIngredients, index)}
            >
              Remove
            </Button>
          </div>
        ))}

        {errors.ingredients ? (
          <p className="text-sm text-red-600">{errors.ingredients[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-foreground text-lg font-semibold">Instructions</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => addListItem(setInstructions)}
          >
            Add step
          </Button>
        </div>

        {instructions.map((instruction, index) => (
          <div key={index} className="flex gap-2">
            <Textarea
              value={instruction}
              onChange={(event) =>
                updateListItem(setInstructions, index, event.target.value)
              }
              rows={3}
              className="flex-1"
              placeholder={`Step ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => removeListItem(setInstructions, index)}
              className="self-start"
            >
              Remove
            </Button>
          </div>
        ))}

        {errors.instructions ? (
          <p className="text-sm text-red-600">{errors.instructions[0]}</p>
        ) : null}
      </div>

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : buttonLabel}
        </Button>

        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
