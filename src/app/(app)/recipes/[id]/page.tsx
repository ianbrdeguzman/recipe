import { PagePlaceholder } from "@/components/page-placeholder";

type RecipeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      eyebrow="Recipe detail"
      title={`Recipe ${id}`}
      description="Mock recipe detail page. This route will show the full recipe, metadata, edit action, delete action, and source information."
      actions={[
        { href: `/recipes/${id}/edit`, label: "Edit recipe" },
        { href: "/recipes", label: "Back to recipes" },
      ]}
    />
  );
}
