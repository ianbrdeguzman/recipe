import Link from "next/link";
import { headers } from "next/headers";

import { SignInButton } from "@/components/signin-button";
import { SignOutButton } from "@/components/signout-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

type HomePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getAuthErrorMessage(error?: string) {
  switch (error) {
    case "auth-required":
      return "Please sign in to view your recipes.";
    case "auth-canceled":
    case "access_denied":
      return "Google sign-in was canceled.";
    case "signout-failed":
      return "Could not sign out right now. Please try again.";
    default:
      return error
        ? "Google sign-in did not complete. Please try again."
        : null;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  const resolvedSearchParams = await searchParams;
  const authErrorMessage = getAuthErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="bg-background flex min-h-screen">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Recipe Keeper
          </p>
          <h1 className="text-foreground text-4xl font-semibold">
            Save recipes manually or import them from a URL.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            This is the public landing page. Authenticated recipe pages now live
            under the App Router recipe routes.
          </p>
        </div>

        {authErrorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {authErrorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <>
              <Button asChild>
                <Link href="/recipes">Go to recipes</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </div>

        <div className="bg-card border-border rounded-2xl border p-6">
          <h2 className="text-foreground text-lg font-semibold">Session</h2>
          <pre className="bg-secondary text-secondary-foreground mt-4 overflow-x-auto rounded-lg p-4 text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
