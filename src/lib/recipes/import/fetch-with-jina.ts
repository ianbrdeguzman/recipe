import { UpstreamFetchError } from "./errors";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CHARS = 30_000;

function toJinaReaderUrl(url: URL) {
  return `https://r.jina.ai/${url.protocol}//${url.host}${url.pathname}${url.search}`;
}

function normalizeReaderContent(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function fetchWithJina({
  url,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxChars = DEFAULT_MAX_CHARS,
}: {
  url: URL;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxChars?: number;
}) {
  const readerUrl = toJinaReaderUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(readerUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new UpstreamFetchError(`Reader responded with ${response.status}`);
    }

    const content = normalizeReaderContent(await response.text());

    if (!content || content.length < 40) {
      throw new UpstreamFetchError("Reader returned empty content");
    }

    return {
      readerUrl,
      content: content.slice(0, maxChars),
    };
  } catch (error) {
    if (error instanceof UpstreamFetchError) {
      throw error;
    }

    throw new UpstreamFetchError(
      error instanceof Error ? error.message : "Reader request failed",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
