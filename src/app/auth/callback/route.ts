import { NextResponse } from "next/server";

import { completeSupabaseSignIn } from "@/platform/auth/complete-sign-in";
import { createSupabaseServerClient } from "@/platform/auth/supabase-server";
import { resolveRequestId } from "@/shared-kernel/http/request-id";
import { resolveLocalReturnPath } from "@/shared-kernel/http/local-return-path";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const nextPath = resolveLocalReturnPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");
  if (!code) return authFailure(requestUrl, nextPath, "missing_code");

  try {
    const supabase = await createSupabaseServerClient();
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    if (exchange.error)
      return authFailure(requestUrl, nextPath, "exchange_failed");

    const failure = await completeSupabaseSignIn(
      supabase,
      resolveRequestId(request.headers.get("x-request-id")),
    );
    if (failure) return authFailure(requestUrl, nextPath, failure);

    const successUrl = new URL(nextPath, requestUrl.origin);
    successUrl.searchParams.set("auth", "signed_in");
    return NextResponse.redirect(successUrl);
  } catch {
    return authFailure(requestUrl, nextPath, "server_error");
  }
}

function authFailure(
  requestUrl: URL,
  nextPath: string,
  code: string,
): NextResponse {
  const failureUrl = new URL("/auth", requestUrl.origin);
  failureUrl.searchParams.set("error", code);
  failureUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(failureUrl);
}
