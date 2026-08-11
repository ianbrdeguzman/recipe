"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitImportRecipe } from "@/lib/recipes/import/submit-import-recipe";

type FieldErrors = Partial<Record<"url", string[]>>;

type ImportRecipeFormProps = {
  initialUrl?: string;
};

export function ImportRecipeForm({ initialUrl = "" }: ImportRecipeFormProps) {
  const router = useRouter();

  const [url, setUrl] = useState(initialUrl);
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
    <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="url" className="text-foreground">
            Recipe URL
          </Label>
          <Input
            id="url"
            name="url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/my-favorite-pasta"
            required
          />
          <p className="text-muted-foreground text-sm">
            Only public http and https recipe pages are supported.
          </p>
          {errors.url ? (
            <p className="text-sm text-red-600">{errors.url[0]}</p>
          ) : null}
        </div>

        <div
          aria-live="polite"
          className="text-muted-foreground border-border rounded-md border border-dashed px-4 py-3 text-sm"
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Importing..." : "Import recipe"}
          </Button>

          <Button asChild type="button" variant="outline">
            <Link href="/recipes">Back to recipes</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
