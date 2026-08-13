import Image from "next/image";

import { getRecipeImagePublicUrl } from "@/lib/recipes/recipe-image-url";

const variantStyles = {
  thumbnail: {
    wrapperClassName: "relative h-24 w-24 shrink-0 overflow-hidden rounded-xl",
    sizes: "96px",
  },
  hero: {
    wrapperClassName: "relative aspect-[16/9] w-full overflow-hidden rounded-2xl",
    sizes: "(max-width: 1024px) 100vw, 896px",
  },
  preview: {
    wrapperClassName: "relative aspect-[16/9] w-full overflow-hidden rounded-2xl",
    sizes: "(max-width: 768px) 100vw, 768px",
  },
} as const;

type RecipeImageVariant = keyof typeof variantStyles;

export function RecipeImage({
  imageKey,
  title,
  variant,
}: {
  imageKey: string | null | undefined;
  title: string;
  variant: RecipeImageVariant;
}) {
  const src = getRecipeImagePublicUrl(imageKey);

  if (!src) {
    return null;
  }

  const selectedVariant = variantStyles[variant];

  return (
    <div className={selectedVariant.wrapperClassName}>
      <Image
        src={src}
        alt={`${title} recipe image`}
        fill
        sizes={selectedVariant.sizes}
        className="object-cover"
      />
    </div>
  );
}
