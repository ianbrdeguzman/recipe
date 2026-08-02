import { PagePlaceholder } from "@/components/page-placeholder";

export default function RecipesPage() {
  return (
    <PagePlaceholder
      eyebrow="Recipe list"
      title="Your recipes"
      description="Mock list page for saved recipes. This route will render the authenticated dashboard and empty-state/list UI in Phase 1."
      actions={[
        { href: "/recipes/new", label: "Create recipe" },
        { href: "/recipes/import", label: "Import from URL" },
      ]}
    />
  );
}
