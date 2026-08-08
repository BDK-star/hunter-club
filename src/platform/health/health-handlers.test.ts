import { describe, expect, it } from "vitest";

import { createHealthHandlers } from "./health-handlers";

const noOpLogger = { error: () => undefined };

describe("health HTTP interface", () => {
  it("reports liveness without touching external dependencies", async () => {
    let databaseProbeCount = 0;
    const handlers = createHealthHandlers({
      clock: () => new Date("2026-08-02T00:00:00.000Z"),
      databaseProbe: async () => {
        databaseProbeCount += 1;
      },
      logger: noOpLogger,
    });

    const response = handlers.live(
      new Request("http://localhost/health/live", {
        headers: { "x-request-id": "request-live-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-live-123");
    expect(await response.json()).toEqual({
      checks: { process: "up" },
      requestId: "request-live-123",
      status: "ok",
      timestamp: "2026-08-02T00:00:00.000Z",
    });
    expect(databaseProbeCount).toBe(0);
  });

  it("reports readiness when the database responds", async () => {
    const handlers = createHealthHandlers({
      clock: () => new Date("2026-08-02T00:00:00.000Z"),
      databaseProbe: async () => undefined,
      logger: noOpLogger,
    });

    const response = await handlers.ready(
      new Request("http://localhost/health/ready", {
        headers: { "x-request-id": "request-ready-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      checks: { database: "up" },
      requestId: "request-ready-123",
      status: "ok",
      timestamp: "2026-08-02T00:00:00.000Z",
    });
  });

  it("returns a stable unavailable response when the database probe fails", async () => {
    const events: Array<{
      fields: Record<string, unknown>;
      message: string;
    }> = [];
    const handlers = createHealthHandlers({
      clock: () => new Date("2026-08-02T00:00:00.000Z"),
      databaseProbe: async () => {
        throw new Error("postgresql://secret@database/internal");
      },
      logger: {
        error(fields, message) {
          events.push({ fields, message });
        },
      },
    });

    const response = await handlers.ready(
      new Request("http://localhost/health/ready", {
        headers: { "x-request-id": "request-ready-456" },
      }),
    );
    const serialized = await response.clone().text();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "服务暂时不可用",
        requestId: "request-ready-456",
      },
    });
    expect(serialized).not.toContain("postgresql://");
    expect(events).toEqual([
      {
        fields: {
          errorType: "Error",
          module: "platform.health",
          operation: "readiness",
          requestId: "request-ready-456",
        },
        message: "Database readiness probe failed",
      },
    ]);
  });
});
