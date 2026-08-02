import Link from "next/link";

type Action = {
  href: string;
  label: string;
};

type PagePlaceholderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: Action[];
};

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  actions = [],
}: PagePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-3xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-600">{description}</p>

        {actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
