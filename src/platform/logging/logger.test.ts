import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

describe("structured application logger", () => {
  it("writes queryable fields while redacting known secrets", () => {
    let output = "";
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createLogger({
      destination,
      environment: "test",
      level: "info",
      version: "test-sha",
    });

    logger.info(
      {
        databaseUrl: "postgresql://secret@database/internal",
        module: "platform.health",
        operation: "readiness",
        requestId: "request-log-123",
        user: { email: "reader@example.com" },
      },
      "Readiness probe completed",
    );

    const event = JSON.parse(output) as Record<string, unknown>;
    expect(event).toMatchObject({
      databaseUrl: "[Redacted]",
      environment: "test",
      level: 30,
      module: "platform.health",
      msg: "Readiness probe completed",
      operation: "readiness",
      requestId: "request-log-123",
      user: { email: "[Redacted]" },
      version: "test-sha",
    });
    expect(event).toHaveProperty("time");
  });
});
