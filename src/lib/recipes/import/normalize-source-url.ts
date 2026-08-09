export function normalizeRecipeSourceUrl(input: string | URL): string {
  const url =
    typeof input === "string" ? new URL(input) : new URL(input.toString());

  url.hostname = url.hostname.toLowerCase();

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
