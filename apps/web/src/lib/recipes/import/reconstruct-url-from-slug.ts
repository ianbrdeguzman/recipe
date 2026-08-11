const SUPPORTED_SCHEMES = new Set(["http:", "https:"]);

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function reconstructUrlFromSlug(
  slug: string[] | undefined,
): string | null {
  if (!slug || slug.length < 2) {
    return null;
  }

  const decodedSlug = slug.map(decodePathSegment);
  const [scheme, rawHost, ...rawPath] = decodedSlug;

  if (!SUPPORTED_SCHEMES.has(scheme)) {
    return null;
  }

  const host = rawHost.trim();

  if (!host) {
    return null;
  }

  const path = rawPath.filter((segment) => segment.length > 0).join("/");

  return path.length > 0 ? `${scheme}//${host}/${path}` : `${scheme}//${host}`;
}
