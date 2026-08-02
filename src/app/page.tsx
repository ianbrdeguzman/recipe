import { SignInButton } from "@/components/signin-button";
import { SignOutButton } from "@/components/signout-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div>
          <h1>This is the landing page</h1>
        </div>
        <div>
          <h2>Server Session</h2>
          {JSON.stringify(session, null, 2)}
        </div>
        <SignInButton />
        <SignOutButton />
      </main>
    </div>
  );
}
