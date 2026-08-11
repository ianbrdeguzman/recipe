import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.2em]">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-4 text-base">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
