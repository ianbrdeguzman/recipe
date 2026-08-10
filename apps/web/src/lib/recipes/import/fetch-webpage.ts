import { UpstreamFetchError } from "./errors";

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWebpage({
  url,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  url: URL;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new UpstreamFetchError(
        `Source URL responded with ${response.status}`,
      );
    }

    const html = (await response.text()).trim();

    if (html.length < 40) {
      throw new UpstreamFetchError("Source URL returned empty HTML");
    }

    return {
      sourceUrl: url.toString(),
      html,
    };
  } catch (error) {
    if (error instanceof UpstreamFetchError) {
      throw error;
    }

    throw new UpstreamFetchError(
      error instanceof Error ? error.message : "Source URL request failed",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
