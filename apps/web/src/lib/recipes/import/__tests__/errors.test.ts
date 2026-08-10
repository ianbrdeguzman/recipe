import { describe, expect, it } from "vitest";

import {
  UnsupportedImportSourceError,
  UpstreamFetchError,
  toImportErrorResponse,
} from "@/lib/recipes/import/errors";

describe("toImportErrorResponse", () => {
  it("maps unsupported sources to 422", async () => {
    const response = toImportErrorResponse(
      new UnsupportedImportSourceError("instagram"),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "This URL type is not supported yet",
    });
  });

  it("maps Jina fetch failures to 424", async () => {
    const response = toImportErrorResponse(
      new UpstreamFetchError("Reader timeout"),
    );

    expect(response.status).toBe(424);
    await expect(response.json()).resolves.toEqual({
      error: "Could not fetch recipe URL",
    });
  });
});
