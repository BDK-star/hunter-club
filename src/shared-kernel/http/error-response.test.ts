import { describe, expect, it } from "vitest";

import { ApplicationError, createErrorResponse } from "./error-response";

describe("HTTP error contract", () => {
  it("returns a stable public error without leaking the internal cause", async () => {
    const response = createErrorResponse(
      new ApplicationError({
        cause: new Error("postgresql://secret@database/internal"),
        code: "DATABASE_UNAVAILABLE",
        message: "服务暂时不可用",
        status: 503,
      }),
      "request-123",
    );

    const serialized = await response.clone().text();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "服务暂时不可用",
        requestId: "request-123",
      },
    });
    expect(serialized).not.toContain("postgresql://");
  });
});
