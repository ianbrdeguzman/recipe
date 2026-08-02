import { PagePlaceholder } from "@/components/page-placeholder";

type EditRecipePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRecipePage({
  params,
}: EditRecipePageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      eyebrow="Edit recipe"
      title={`Edit recipe ${id}`}
      description="Mock edit page. This route will reuse the recipe form, prefill existing data, and submit updates back to the recipe API."
      actions={[
        { href: `/recipes/${id}`, label: "Back to detail" },
        { href: "/recipes", label: "Back to recipes" },
      ]}
    />
  );
}
