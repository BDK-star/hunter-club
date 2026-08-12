import { z } from "zod";

const serverEnvironmentSchema = z
  .object({
    APP_BASE_URL: z.url(),
    APP_ENV: z.enum(["local", "test", "preview", "production"]),
    DATABASE_MIGRATION_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }).optional(),
    SEARCH_METRIC_FINGERPRINT_KEY: z.string().min(32).optional(),
  })
  .superRefine((environment, context) => {
    const hasKey =
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined;
    const hasUrl = environment.NEXT_PUBLIC_SUPABASE_URL !== undefined;
    if (hasKey !== hasUrl) {
      context.addIssue({
        code: "custom",
        message:
          "Supabase Auth URL and publishable key must be configured together",
        path: [
          hasKey
            ? "NEXT_PUBLIC_SUPABASE_URL"
            : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        ],
      });
    }
  });

export type ServerEnvironment = Readonly<{
  appBaseUrl: string;
  appEnvironment: z.infer<typeof serverEnvironmentSchema>["APP_ENV"];
  databaseMigrationUrl: string;
  databaseUrl: string;
  logLevel: z.infer<typeof serverEnvironmentSchema>["LOG_LEVEL"];
  searchMetricFingerprintKey: string | null;
  supabaseAuth: Readonly<{
    publishableKey: string;
    url: string;
  }> | null;
}>;

export class InvalidServerEnvironmentError extends Error {
  constructor(fields: readonly string[]) {
    super(`Invalid server environment: ${fields.join(", ")}`);
    this.name = "InvalidServerEnvironmentError";
  }
}

export function parseServerEnvironment(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ].sort();
    throw new InvalidServerEnvironmentError(fields);
  }

  return Object.freeze({
    appBaseUrl: new URL(result.data.APP_BASE_URL).toString(),
    appEnvironment: result.data.APP_ENV,
    databaseMigrationUrl: result.data.DATABASE_MIGRATION_URL,
    databaseUrl: result.data.DATABASE_URL,
    logLevel: result.data.LOG_LEVEL,
    searchMetricFingerprintKey:
      result.data.SEARCH_METRIC_FINGERPRINT_KEY ?? null,
    supabaseAuth:
      result.data.NEXT_PUBLIC_SUPABASE_URL &&
      result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? Object.freeze({
            publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            url: new URL(result.data.NEXT_PUBLIC_SUPABASE_URL).toString(),
          })
        : null,
  });
}
