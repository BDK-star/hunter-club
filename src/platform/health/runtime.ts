import { probeRuntimeDatabase } from "@/platform/database/runtime";
import { createLogger } from "@/platform/logging/logger";

import { createHealthHandlers } from "./health-handlers";

const allowedLogLevels = new Set([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);
const requestedLogLevel = process.env.LOG_LEVEL ?? "info";
const logLevel = allowedLogLevels.has(requestedLogLevel)
  ? requestedLogLevel
  : "info";
const logger = createLogger({
  environment: process.env.APP_ENV ?? "unknown",
  level: logLevel,
  version: process.env.VERCEL_GIT_COMMIT_SHA ?? "development",
});

export const healthHandlers = createHealthHandlers({
  clock: () => new Date(),
  databaseProbe: probeRuntimeDatabase,
  logger,
});
