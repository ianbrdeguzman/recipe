"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitImportRecipe } from "@/lib/recipes/import/submit-import-recipe";

type FieldErrors = Partial<Record<"url", string[]>>;

export function ImportRecipeForm() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    const result = await submitImportRecipe({ url });

    if (!result.ok) {
      setErrors(result.fieldErrors);
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push(`/recipes/${result.data.id}`);
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-2">
          <label htmlFor="url" className="text-sm font-medium text-zinc-900">
            Recipe URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/my-favorite-pasta"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="text-sm text-zinc-600">
            Only public http and https recipe pages are supported.
          </p>
          {errors.url ? (
            <p className="text-sm text-red-600">{errors.url[0]}</p>
          ) : null}
        </div>

        <div
          aria-live="polite"
          className="rounded-md border border-zinc-200 border-dashed px-4 py-3 text-sm text-zinc-600"
        >
          {isSubmitting
            ? "Importing recipe..."
            : "Paste a recipe URL above to start importing."}
        </div>

        {formError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Importing..." : "Import recipe"}
          </button>

          <Link
            href="/recipes"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
          >
            Back to recipes
          </Link>
        </div>
      </form>
    </div>
  );
}
