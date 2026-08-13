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
      searchMetricFingerprintKey: null,
      supabaseAuth: null,
    });
  });

  it("rejects a short search metric HMAC key", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        SEARCH_METRIC_FINGERPRINT_KEY: "short",
      }),
    ).toThrowError(/SEARCH_METRIC_FINGERPRINT_KEY/);
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

  it("requires the Supabase Auth URL and publishable key as one feature pair", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);

    expect(
      parseServerEnvironment({
        ...validEnvironment,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_test-only-key-value",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }).supabaseAuth,
    ).toEqual({
      publishableKey: "sb_publishable_test-only-key-value",
      url: "https://project.supabase.co/",
    });
  });
});
