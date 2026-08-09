export class ImportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly userMessage: string,
  ) {
    super(message);
  }
}

export class UnsupportedImportSourceError extends ImportError {
  constructor(sourceType: string) {
    super(
      `Unsupported import source: ${sourceType}`,
      422,
      "This URL type is not supported yet",
    );
  }
}

export class UpstreamFetchError extends ImportError {
  constructor(message: string) {
    super(message, 424, "Could not fetch recipe URL");
  }
}

export class RecipeExtractionError extends ImportError {
  constructor(message: string) {
    super(message, 502, "Could not extract recipe automatically");
  }
}

export class RecipeValidationError extends ImportError {
  constructor(message: string) {
    super(message, 502, "Could not extract recipe automatically");
  }
}

export class RecipePersistenceError extends ImportError {
  constructor(message: string) {
    super(message, 500, "Please try manual entry instead");
  }
}

export function toImportErrorResponse(error: unknown): Response {
  if (error instanceof ImportError) {
    return Response.json(
      { error: error.userMessage },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "Please try manual entry instead" },
    { status: 500 },
  );
}
