import type { ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="bg-background min-h-screen">
      <AppNav userName={session.user.name ?? session.user.email} />
      {children}
    </div>
  );
}
