import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./server";

const validEnvironment = {
  APP_BASE_URL: "http://localhost:3000",
  APP_ENV: "test",
  DATABASE_MIGRATION_URL:
    "postgresql://hunter_club:hunter_club@localhost:5432/hunter_club",
  DATABASE_URL:
    "postgresql://hunter_club:hunter_club@localhost:5432/hunter_club",
  LOG_LEVEL: "info",
};

describe("server environment", () => {
  it("accepts the documented local configuration contract", () => {
    expect(parseServerEnvironment(validEnvironment)).toEqual({
      appBaseUrl: "http://localhost:3000/",
      appEnvironment: "test",
      databaseMigrationUrl: validEnvironment.DATABASE_MIGRATION_URL,
      databaseUrl: validEnvironment.DATABASE_URL,
      logLevel: "info",
    });
  });

  it("rejects a missing database connection without exposing other values", () => {
    const secret = "must-not-appear";

    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        DATABASE_URL: undefined,
        UNUSED_SECRET: secret,
      }),
    ).toThrowError(/DATABASE_URL/);

    try {
      parseServerEnvironment({
        ...validEnvironment,
        DATABASE_URL: undefined,
        UNUSED_SECRET: secret,
      });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
