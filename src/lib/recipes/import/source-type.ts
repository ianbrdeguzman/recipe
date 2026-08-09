import type { ImportSourceType } from "./types";

export function detectImportSourceType(url: URL): ImportSourceType {
  const host = url.hostname.toLowerCase();

  if (host === "instagram.com" || host === "www.instagram.com") {
    return "instagram";
  }

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "youtu.be"
  ) {
    return "youtube";
  }

  if (host === "tiktok.com" || host === "www.tiktok.com") {
    return "tiktok";
  }

  return "webpage";
}
