import { resolveRequestId } from "@/shared-kernel/http/request-id";
import {
  ApplicationError,
  createErrorResponse,
} from "@/shared-kernel/http/error-response";

export type HealthHandlerDependencies = Readonly<{
  clock: () => Date;
  databaseProbe: () => Promise<void>;
  logger: Readonly<{
    error: (fields: Record<string, unknown>, message: string) => void;
  }>;
}>;

export function createHealthHandlers(dependencies: HealthHandlerDependencies) {
  return {
    live(request: Request): Response {
      const requestId = resolveRequestId(request.headers.get("x-request-id"));

      return Response.json(
        {
          checks: { process: "up" },
          requestId,
          status: "ok",
          timestamp: dependencies.clock().toISOString(),
        },
        {
          headers: {
            "cache-control": "no-store",
            "x-request-id": requestId,
          },
        },
      );
    },
    async ready(request: Request): Promise<Response> {
      const requestId = resolveRequestId(request.headers.get("x-request-id"));
      try {
        await dependencies.databaseProbe();
      } catch (cause) {
        dependencies.logger.error(
          {
            errorType: cause instanceof Error ? cause.name : "UnknownError",
            module: "platform.health",
            operation: "readiness",
            requestId,
          },
          "Database readiness probe failed",
        );
        return createErrorResponse(
          new ApplicationError({
            cause,
            code: "DATABASE_UNAVAILABLE",
            message: "服务暂时不可用",
            status: 503,
          }),
          requestId,
        );
      }

      return Response.json(
        {
          checks: { database: "up" },
          requestId,
          status: "ok",
          timestamp: dependencies.clock().toISOString(),
        },
        {
          headers: {
            "cache-control": "no-store",
            "x-request-id": requestId,
          },
        },
      );
    },
  };
}
