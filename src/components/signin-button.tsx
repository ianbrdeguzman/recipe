"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/recipes",
        errorCallbackURL: "/?error=auth-failed",
      });
    } catch {
      setError("Could not start Google sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-2">
      <button
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        disabled={loading}
        onClick={signIn}
      >
        {loading ? "Signing in..." : "Continue with Google"}
      </button>

      {error ? (
        <p className="text-sm text-red-700">
          Could not start Google sign-in. Please try again.
        </p>
      ) : null}
    </div>
  );
}
