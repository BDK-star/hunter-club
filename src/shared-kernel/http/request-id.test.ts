import { describe, expect, it } from "vitest";

import { resolveRequestId } from "./request-id";

describe("request correlation ID", () => {
  it("preserves a safe caller-provided ID", () => {
    expect(resolveRequestId("req-browser_123.abc:456")).toBe(
      "req-browser_123.abc:456",
    );
  });

  it("replaces an unsafe caller-provided ID", () => {
    const resolved = resolveRequestId("request-id\r\ninjected-header: true");

    expect(resolved).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
