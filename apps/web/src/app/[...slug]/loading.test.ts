import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Loading from "@/app/[...slug]/loading";

describe("Slug import loading UI", () => {
  it("renders an importing message for the route segment", () => {
    const html = renderToStaticMarkup(Loading());

    expect(html).toContain("Importing recipe");
    expect(html).toContain("We&#x27;re importing this recipe now");
    expect(html).not.toContain("href=");
  });
});
