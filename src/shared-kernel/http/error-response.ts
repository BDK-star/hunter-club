export type ApplicationErrorOptions = Readonly<{
  cause?: unknown;
  code: string;
  message: string;
  status: number;
}>;

export class ApplicationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(options: ApplicationErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ApplicationError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function createErrorResponse(
  error: ApplicationError,
  requestId: string,
): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
      status: error.status,
    },
  );
}
