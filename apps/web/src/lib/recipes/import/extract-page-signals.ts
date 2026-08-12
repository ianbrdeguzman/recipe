import { load } from "cheerio";

export type PageMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
};

export type PartialRecipeFields = {
  title: string | null;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: string[];
  instructions: string[];
};

export type PageSignals = {
  metadata: PageMetadata;
  recipe: PartialRecipeFields;
};

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

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
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

function parseJsonLdBlock(raw: string | null | undefined): unknown[] {
  const value = raw?.trim();
  if (!value) {
    return [];
  }

  try {
    return [JSON.parse(value)];
  } catch {
    return [];
  }
}

function emptyRecipeFields(): PartialRecipeFields {
  return {
    title: null,
    description: null,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    ingredients: [],
    instructions: [],
  };
}

function extractPartialRecipeFields(
  node: Record<string, unknown>,
): PartialRecipeFields {
  return {
    title: firstNonEmpty(normalizeText(node.name), normalizeText(node.headline)),
    description: firstNonEmpty(normalizeText(node.description)),
    servings: parseServings(node.recipeYield),
    prepTimeMinutes: parseDurationToMinutes(node.prepTime),
    cookTimeMinutes: parseDurationToMinutes(node.cookTime),
    ingredients: parseIngredients(node.recipeIngredient ?? node.ingredients),
    instructions: collectInstructionTexts(
      node.recipeInstructions ?? node.instructions,
    ),
  };
}

export function extractPageSignals({ html }: { html: string }): PageSignals {
  const $ = load(html);
  const metadata: PageMetadata = {
    title: firstNonEmpty(
      $("meta[property='og:title']").attr("content"),
      $("title").first().text(),
    ),
    description: firstNonEmpty(
      $("meta[property='og:description']").attr("content"),
      $("meta[name='description']").attr("content"),
    ),
    image: firstNonEmpty($("meta[property='og:image']").attr("content")),
  };

  const parsedBlocks = $("script[type='application/ld+json']")
    .toArray()
    .flatMap((element) => parseJsonLdBlock($(element).html()));

  const recipeNodes = parsedBlocks.flatMap((value) => collectRecipeNodes(value));
  const recipe = recipeNodes[0]
    ? extractPartialRecipeFields(recipeNodes[0])
    : emptyRecipeFields();

  return {
    metadata,
    recipe,
  };
}
