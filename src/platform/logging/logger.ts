import pino, { type DestinationStream, type Logger } from "pino";

export type LoggerOptions = Readonly<{
  destination?: DestinationStream;
  environment: string;
  level: string;
  version: string;
}>;

const redactedPaths = [
  "authorization",
  "cookie",
  "databaseUrl",
  "databaseMigrationUrl",
  "*.authorization",
  "*.cookie",
  "*.databaseUrl",
  "*.databaseMigrationUrl",
  "*.email",
  "*.password",
  "*.secret",
  "*.token",
];

export function createLogger(options: LoggerOptions): Logger {
  return pino(
    {
      base: {
        environment: options.environment,
        version: options.version,
      },
      level: options.level,
      redact: {
        censor: "[Redacted]",
        paths: redactedPaths,
      },
    },
    options.destination,
  );
}
