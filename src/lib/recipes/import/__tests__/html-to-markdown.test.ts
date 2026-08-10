import { describe, expect, it } from "vitest";

import { htmlToMarkdown } from "@/lib/recipes/import/html-to-markdown";

describe("htmlToMarkdown", () => {
  it("converts recipe HTML into readable markdown", () => {
    const html = `
      <html>
        <head>
          <script>window.ignore = true;</script>
          <style>.hidden { display: none; }</style>
        </head>
        <body>
          <h1>Best Pancakes</h1>
          <p>Light &amp; fluffy.</p>
          <ul>
            <li>1 cup flour</li>
            <li>1 egg</li>
          </ul>
        </body>
      </html>
    `;

    const markdown = htmlToMarkdown(html);

    expect(markdown).toContain("# Best Pancakes");
    expect(markdown).toContain("\n\nLight & fluffy.");
    expect(markdown).toContain("- 1 cup flour");
    expect(markdown).toContain("- 1 egg");
    expect(markdown).not.toContain("window.ignore");
    expect(markdown).not.toContain("display: none");
  });
});
