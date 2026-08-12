import type { PageMetadata, PartialRecipeFields } from "./extract-page-signals";

function collectStructuredLines(recipe: PartialRecipeFields) {
  const lines: string[] = [];

  if (recipe.title) {
    lines.push(`JSON-LD title: ${recipe.title}`);
  }

  if (recipe.description) {
    lines.push(`JSON-LD description: ${recipe.description}`);
  }

  if (recipe.servings) {
    lines.push(`Servings: ${recipe.servings}`);
  }

  if (recipe.prepTimeMinutes) {
    lines.push(`Prep time: ${recipe.prepTimeMinutes} minutes`);
  }

  if (recipe.cookTimeMinutes) {
    lines.push(`Cook time: ${recipe.cookTimeMinutes} minutes`);
  }

  if (recipe.ingredients.length > 0) {
    lines.push("Ingredients:");
    lines.push(...recipe.ingredients.map((ingredient) => `- ${ingredient}`));
  }

  if (recipe.instructions.length > 0) {
    lines.push("Instructions:");
    lines.push(...recipe.instructions.map((instruction) => `- ${instruction}`));
  }

  return lines;
}

export function formatWebpageFallbackContent({
  metadata,
  recipe,
  markdown,
}: {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
  markdown: string;
}) {
  const lines: string[] = [];

  if (metadata.title || metadata.description || metadata.image) {
    lines.push("Page metadata:");

    if (metadata.title) {
      lines.push(`Title: ${metadata.title}`);
    }

    if (metadata.description) {
      lines.push(`Description: ${metadata.description}`);
    }

    if (metadata.image) {
      lines.push(`Image: ${metadata.image}`);
    }
  }

  const structuredLines = collectStructuredLines(recipe);
  if (structuredLines.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push("Structured recipe data found:");
    lines.push(...structuredLines);
  }

  const trimmedMarkdown = markdown.trim();
  if (trimmedMarkdown) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push("Page content:");
    lines.push(trimmedMarkdown);
  }

  return lines.join("\n").trim();
}
