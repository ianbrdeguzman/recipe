"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const signOut = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await authClient.signOut();
      router.refresh();
    } catch {
      setError("Could not sign out right now. Please try again.");
      router.push("/?error=signout-failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <div className="space-y-2">
      <button
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        disabled={loading}
        onClick={signOut}
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>

      {error ? (
        <p className="text-sm text-red-700">
          Could not sign out right now. Please try again.
        </p>
      ) : null}
    </div>
  );
}
