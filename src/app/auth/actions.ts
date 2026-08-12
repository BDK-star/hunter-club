"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { completeSupabaseSignIn } from "@/platform/auth/complete-sign-in";
import { deleteInternalSessionCookie } from "@/platform/auth/internal-session-cookie";
import { revokeCurrentInternalSession } from "@/platform/auth/internal-session";
import {
  createSupabaseServerClient,
  isSupabaseAuthConfigured,
} from "@/platform/auth/supabase-server";
import { getServerEnvironment } from "@/platform/config/runtime";
import { resolveRequestId } from "@/shared-kernel/http/request-id";

const emailSchema = z
  .email()
  .max(320)
  .transform((email) => email.toLowerCase());
const otpSchema = z.string().regex(/^\d{6}$/);

export async function requestEmailOtp(formData: FormData): Promise<void> {
  if (!isSupabaseAuthConfigured()) redirect("/auth?error=unavailable");

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/auth?error=invalid_email");

  const nextPath = resolveSafeNextPath(formData.get("next"));
  const environment = getServerEnvironment();
  const callback = new URL("/auth/callback", environment.appBaseUrl);
  callback.searchParams.set("next", nextPath);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  });

  redirect(
    error
      ? `/auth?error=otp_failed&next=${encodeURIComponent(nextPath)}`
      : `/auth?sent=1&next=${encodeURIComponent(nextPath)}`,
  );
}

export async function verifyEmailOtp(formData: FormData): Promise<void> {
  if (!isSupabaseAuthConfigured()) redirect("/auth?error=unavailable");

  const email = emailSchema.safeParse(formData.get("email"));
  const token = otpSchema.safeParse(formData.get("token"));
  const nextPath = resolveSafeNextPath(formData.get("next"));
  if (!email.success || !token.success) {
    redirect(`/auth?error=invalid_otp&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createSupabaseServerClient();
  const verification = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });
  if (verification.error) {
    redirect(
      `/auth?error=otp_verify_failed&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const requestHeaders = await headers();
  const failure = await completeSupabaseSignIn(
    supabase,
    resolveRequestId(requestHeaders.get("x-request-id")),
  );
  if (failure) {
    redirect(`/auth?error=${failure}&next=${encodeURIComponent(nextPath)}`);
  }
  redirect(`${nextPath}?auth=signed_in`);
}

export async function signInWithGitHub(formData: FormData): Promise<void> {
  if (!isSupabaseAuthConfigured()) redirect("/auth?error=unavailable");

  const environment = getServerEnvironment();
  const callback = new URL("/auth/callback", environment.appBaseUrl);
  callback.searchParams.set("next", resolveSafeNextPath(formData.get("next")));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) redirect("/auth?error=github_failed");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  await revokeCurrentInternalSession();
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  await deleteInternalSessionCookie();
  redirect("/?auth=signed_out");
}

function resolveSafeNextPath(candidate: FormDataEntryValue | null): string {
  return typeof candidate === "string" &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//")
    ? candidate
    : "/saloon";
}
