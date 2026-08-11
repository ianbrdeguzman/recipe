const SUPPORTED_SCHEMES = new Set(["http:", "https:"]);

export function reconstructUrlFromSlug(
  slug: string[] | undefined,
): string | null {
  if (!slug || slug.length < 2) {
    return null;
  }

  const [scheme, rawHost, ...rawPath] = slug;

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
