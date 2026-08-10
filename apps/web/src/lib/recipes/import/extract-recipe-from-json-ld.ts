import type { RecipeInput } from "@/lib/recipes/schema";

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? decodeHtmlEntities(value).trim() : "";
}

function parseServings(value: unknown): number | null {
  for (const entry of toArray(value)) {
    if (typeof entry === "number" && Number.isInteger(entry) && entry > 0) {
      return entry;
    }

    if (typeof entry === "string") {
      const match = entry.match(/\d+/);
      if (match) {
        return Number.parseInt(match[0], 10);
      }
    }
  }

  return null;
}

function parseDurationToMinutes(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^P(?:([\d]+)D)?(?:T(?:([\d]+)H)?(?:([\d]+)M)?(?:([\d]+)S)?)?$/i,
  );

  if (!match) {
    return null;
  }

  const [, daysText, hoursText, minutesText, secondsText] = match;

  const days = Number.parseInt(daysText ?? "0", 10);
  const hours = Number.parseInt(hoursText ?? "0", 10);
  const minutes = Number.parseInt(minutesText ?? "0", 10);
  const seconds = Number.parseInt(secondsText ?? "0", 10);
  const totalMinutes =
    days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);

  return totalMinutes > 0 ? totalMinutes : null;
}

function parseIngredients(value: unknown) {
  return toArray(value)
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);
}

function collectInstructionTexts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = normalizeText(value);
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectInstructionTexts(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Record<string, unknown>;

  return [candidate.text, candidate.name, candidate.itemListElement]
    .flatMap((entry) => collectInstructionTexts(entry))
    .filter((entry, index, all) => all.indexOf(entry) === index);
}

function collectRecipeNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectRecipeNodes(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const node = value as Record<string, unknown>;
  const typeValues = toArray(node["@type"]);
  const isRecipe = typeValues.some(
    (entry) => normalizeText(entry).toLowerCase() === "recipe",
  );

  return [
    ...(isRecipe ? [node] : []),
    ...collectRecipeNodes(node["@graph"]),
    ...collectRecipeNodes(node.mainEntity),
    ...collectRecipeNodes(node.itemListElement),
  ];
}

function parseJsonLdBlocks(html: string) {
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  const parsed: unknown[] = [];

  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      parsed.push(JSON.parse(raw));
    } catch {
      continue;
    }
  }

  return parsed;
}

function toCompleteRecipeInput(
  node: Record<string, unknown>,
): RecipeInput | null {
  const title = normalizeText(node.name) || normalizeText(node.headline);
  const servings = parseServings(node.recipeYield);
  const prepTimeMinutes = parseDurationToMinutes(node.prepTime);
  const cookTimeMinutes = parseDurationToMinutes(node.cookTime);
  const ingredients = parseIngredients(
    node.recipeIngredient ?? node.ingredients,
  );
  const instructions = collectInstructionTexts(
    node.recipeInstructions ?? node.instructions,
  );

  if (
    !title ||
    !servings ||
    !prepTimeMinutes ||
    !cookTimeMinutes ||
    ingredients.length === 0 ||
    instructions.length === 0
  ) {
    return null;
  }

  console.log(">>> PASS JSONLD");
  return {
    title,
    description: normalizeText(node.description) || null,
    servings,
    prepTimeMinutes,
    cookTimeMinutes,
    ingredients,
    instructions,
  };
}

export function extractRecipeFromJsonLd({
  html,
}: {
  html: string;
}): RecipeInput | null {
  const blocks = parseJsonLdBlocks(html);

  for (const block of blocks) {
    for (const node of collectRecipeNodes(block)) {
      const recipe = toCompleteRecipeInput(node);
      if (recipe) {
        return recipe;
      }
    }
  }

  return null;
}
