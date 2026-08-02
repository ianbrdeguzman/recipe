"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      await authClient.signIn.social({
        provider: "google",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      disabled={loading}
      onClick={signIn}
    >
      {loading ? "Signing in..." : "Sign In"}
    </button>
  );
}
