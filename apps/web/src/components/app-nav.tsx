import Link from "next/link";

import { SignOutButton } from "@/components/signout-button";

type AppNavProps = {
  userName?: string | null;
};

export function AppNav({ userName }: AppNavProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/recipes" className="text-lg font-semibold text-zinc-900">
            Recipe Keeper
          </Link>
          <p className="text-sm text-zinc-500">
            {userName ? `Signed in as ${userName}` : "Signed in"}
          </p>
        </div>

        <nav className="flex items-center gap-4 text-sm text-zinc-700">
          <Link href="/recipes">Recipes</Link>
          <Link href="/recipes/new">New Recipe</Link>
          <Link href="/recipes/import">Import Recipe</Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
