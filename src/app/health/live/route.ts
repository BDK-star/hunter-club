import { healthHandlers } from "@/platform/health/runtime";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return healthHandlers.live(request);
}
