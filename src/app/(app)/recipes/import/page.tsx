import Link from "next/link";

export default function ImportRecipePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          URL import
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Import a recipe
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          Paste a recipe URL and we&apos;ll try to extract the ingredients,
          instructions, and basic details automatically.
        </p>
        <div>
          <Link
            href="/recipes"
            className="text-sm font-medium text-zinc-700 underline underline-offset-4"
          >
            Back to recipes
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form className="flex flex-col gap-6">
          <div className="grid gap-2">
            <label htmlFor="url" className="text-sm font-medium text-zinc-900">
              Recipe URL
            </label>
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com/my-favorite-pasta"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="text-sm text-zinc-600">
              Only public http and https recipe pages are supported.
            </p>
          </div>

          <div className="rounded-md border border-zinc-200 border-dashed px-4 py-3 text-sm text-zinc-600">
            Loading and import status will appear here.
          </div>

          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Import errors will appear here, for example: “Could not extract
            recipe automatically. Please try manual entry instead.”
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Import recipe
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

      <div className="flex flex-col gap-2 text-sm text-zinc-600">
        <p>
          Import works best with pages that clearly include ingredients and
          instructions.
        </p>
        <p>
          Having trouble? You can{" "}
          <Link
            href="/recipes/new"
            className="font-medium text-zinc-700 underline underline-offset-4"
          >
            create a recipe manually
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
