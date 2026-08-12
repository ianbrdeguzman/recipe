export default function Loading() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          URL import
        </p>
        <h1 className="text-foreground text-3xl font-semibold">
          Importing recipe...
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          We&apos;re importing this recipe now. This can take a few seconds.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="bg-card border-border rounded-2xl border px-4 py-6 text-sm text-muted-foreground"
      >
        Fetching recipe details and creating your saved copy.
      </div>
    </section>
  );
}
