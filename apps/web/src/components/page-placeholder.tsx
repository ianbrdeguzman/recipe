import Link from "next/link";

import { Button } from "@/components/ui/button";

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
      <div className="bg-card border-border rounded-2xl border border-dashed p-8">
        {eyebrow ? (
          <p className="text-muted-foreground mb-2 text-sm font-medium uppercase tracking-wide">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-foreground text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base">{description}</p>

        {actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button key={action.href} asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
