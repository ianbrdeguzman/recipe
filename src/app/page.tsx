import { getAllUsers } from "@/drizzle";

export default async function Home() {
  const allUsers = await getAllUsers();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {JSON.stringify(allUsers, null, 2)}
      </main>
    </div>
  );
}
