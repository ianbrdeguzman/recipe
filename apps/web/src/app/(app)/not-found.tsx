import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16">
      <div className="bg-card border-border w-full rounded-2xl border p-10 text-center shadow-sm">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.2em]">
          404
        </p>
        <h1 className="text-foreground mt-4 text-3xl font-semibold">
          Recipe not found
        </h1>
        <p className="text-muted-foreground mt-3 text-base">
          We couldn’t find that recipe. It may have been deleted, or you may not
          have access to it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/recipes">Back to recipes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/recipes/new">Create recipe</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
