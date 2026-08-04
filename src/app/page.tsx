import Link from "next/link";
import { headers } from "next/headers";

import { SignInButton } from "@/components/signin-button";
import { SignOutButton } from "@/components/signout-button";
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
    case "auth-failed":
      return "Google sign-in did not complete. Please try again.";
    case "auth-canceled":
      return "Google sign-in was canceled.";
    case "signout-failed":
      return "Could not sign out right now. Please try again.";
    default:
      return null;
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
    <main className="flex min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Recipe Keeper
          </p>
          <h1 className="text-4xl font-semibold text-zinc-900">
            Save recipes manually or import them from a URL.
          </h1>
          <p className="max-w-2xl text-base text-zinc-600">
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
              <Link
                href="/recipes"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Go to recipes
              </Link>
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Session</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
