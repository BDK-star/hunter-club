import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("request proxy", () => {
  it("returns the correlation ID to the caller", () => {
    const response = proxy(
      new NextRequest("http://localhost/catalog", {
        headers: { "x-request-id": "request-proxy-123" },
      }),
    );

    expect(response.headers.get("x-request-id")).toBe("request-proxy-123");
  });
});
