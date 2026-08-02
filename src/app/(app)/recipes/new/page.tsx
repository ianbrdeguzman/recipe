import { PagePlaceholder } from "@/components/page-placeholder";

export default function NewRecipePage() {
  return (
    <PagePlaceholder
      eyebrow="Manual entry"
      title="Create a new recipe"
      description="Mock manual recipe form page. This route will host the create form for title, description, servings, times, ingredients, and instructions."
      actions={[{ href: "/recipes", label: "Back to recipes" }]}
    />
  );
}
