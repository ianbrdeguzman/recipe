import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-4 text-base text-zinc-600">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
