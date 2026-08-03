"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const createRecipeErrorResponseSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

const createRecipeResponseSchema = z.object({
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

export function NewRecipeForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("");
  const [cookTimeMinutes, setCookTimeMinutes] = useState("");
  const [ingredients, setIngredients] = useState([""]);
  const [instructions, setInstructions] = useState([""]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) {
    setter((items) => items.map((item, i) => (i === index ? value : item)));
  }

  function addListItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((items) => [...items, ""]);
  }

  function removeListItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) {
    setter((items) =>
      items.length === 1 ? items : items.filter((_, i) => i !== index),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    const response = await fetch("/api/recipes", {
      method: "POST",
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

    if (!response.ok) {
      const data = await response.json();
      const result = createRecipeErrorResponseSchema.safeParse(data);

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

    const data = await response.json();
    const result = createRecipeResponseSchema.safeParse(data);

    if (!result.success) {
      setFormError("Recipe was saved, but the response was invalid.");
      return;
    }

    const recipe = result.data;
    router.push(`/recipes/${recipe.id}`);
  }

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
          {isSubmitting ? "Saving..." : "Create recipe"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/recipes")}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
