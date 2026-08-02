import { PagePlaceholder } from "@/components/page-placeholder";

export default function ImportRecipePage() {
  return (
    <PagePlaceholder
      eyebrow="URL import"
      title="Import a recipe from a URL"
      description="Mock import page. This route will hold the URL form, loading state, and import error handling for the AI extraction flow."
      actions={[{ href: "/recipes", label: "Back to recipes" }]}
    />
  );
}
