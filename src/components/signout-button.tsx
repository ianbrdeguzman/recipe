"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      await authClient.signOut();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <button
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      disabled={loading}
      onClick={signIn}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
