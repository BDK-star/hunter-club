import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { ServerEnvironment } from "@/platform/config/server";

export async function refreshSupabaseAuth(
  request: NextRequest,
  requestHeaders: Headers,
  auth: NonNullable<ServerEnvironment["supabaseAuth"]>,
): Promise<NextResponse> {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(auth.url, auth.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims validates the JWT signature; getSession alone is not trusted.
  await supabase.auth.getClaims();
  return response;
}
