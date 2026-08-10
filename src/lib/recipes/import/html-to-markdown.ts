import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndown.remove(["script", "style", "noscript"]);

export function htmlToMarkdown(html: string) {
  return turndown
    .turndown(html)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^-\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
