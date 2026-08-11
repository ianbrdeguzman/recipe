import Link from "next/link";

import { SignOutButton } from "@/components/signout-button";

type AppNavProps = {
  userName?: string | null;
};

export function AppNav({ userName }: AppNavProps) {
  return (
    <header className="bg-card border-border border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/recipes" className="text-foreground text-lg font-semibold">
            Recipe Keeper
          </Link>
          <p className="text-muted-foreground text-sm">
            {userName ? `Signed in as ${userName}` : "Signed in"}
          </p>
        </div>

        <nav className="text-foreground flex items-center gap-4 text-sm">
          <Link href="/recipes">Recipes</Link>
          <Link href="/recipes/new">New Recipe</Link>
          <Link href="/recipes/import">Import Recipe</Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
