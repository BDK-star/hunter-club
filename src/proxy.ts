import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveRequestId } from "@/shared-kernel/http/request-id";
import { refreshSupabaseAuth } from "@/platform/auth/supabase-proxy";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const auth = resolveSupabaseAuthConfiguration(process.env);
  let response: NextResponse;
  try {
    response = auth
      ? await refreshSupabaseAuth(request, requestHeaders, auth)
      : NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Authentication outage must not block public, read-only routes.
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set("x-request-id", requestId);
  return response;
}

function resolveSupabaseAuthConfiguration(
  environment: NodeJS.ProcessEnv,
): Readonly<{ publishableKey: string; url: string }> | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { publishableKey, url };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
