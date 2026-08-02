import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_BASE_URL: z.url(),
  APP_ENV: z.enum(["local", "test", "preview", "production"]),
  DATABASE_MIGRATION_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type ServerEnvironment = Readonly<{
  appBaseUrl: string;
  appEnvironment: z.infer<typeof serverEnvironmentSchema>["APP_ENV"];
  databaseMigrationUrl: string;
  databaseUrl: string;
  logLevel: z.infer<typeof serverEnvironmentSchema>["LOG_LEVEL"];
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
  });
}
