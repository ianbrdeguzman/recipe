import type { ImportSourceType } from "./types";

export function detectImportSourceType(_url: URL): ImportSourceType {
  return "webpage";
}
