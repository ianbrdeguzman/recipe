import Link from "next/link";

export default function AppNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-zinc-900">
          Recipe not found
        </h1>
        <p className="mt-3 text-base text-zinc-600">
          We couldn’t find that recipe. It may have been deleted, or you may not
          have access to it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/recipes"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Back to recipes
          </Link>
          <Link
            href="/recipes/new"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Create recipe
          </Link>
        </div>
      </div>
    </section>
  );
}
