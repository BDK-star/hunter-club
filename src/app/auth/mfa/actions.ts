"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { completeSupabaseSignIn } from "@/platform/auth/complete-sign-in";
import { revokeCurrentInternalSession } from "@/platform/auth/internal-session";
import {
  createSupabaseServerClient,
  isSupabaseAuthConfigured,
} from "@/platform/auth/supabase-server";
import { resolveRequestId } from "@/shared-kernel/http/request-id";

const codeSchema = z.string().regex(/^\d{6}$/);
const factorIdSchema = z.uuid();

export type TotpEnrollmentState = Readonly<{
  factorId: string | null;
  issue: string | null;
  qrCodeDataUrl: string | null;
  secret: string | null;
}>;

export async function enrollTotp(
  state: TotpEnrollmentState,
): Promise<TotpEnrollmentState> {
  void state;
  if (!isSupabaseAuthConfigured()) return enrollmentIssue("unavailable");

  const supabase = await createSupabaseServerClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims) {
    return enrollmentIssue("authentication_required");
  }

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) return enrollmentIssue("factor_list_failed");
  if (factors.data.totp.length > 0) return enrollmentIssue("factor_exists");

  for (const factor of factors.data.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const removal = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (removal.error) return enrollmentIssue("factor_cleanup_failed");
    }
  }

  const enrollment = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Hunter Club 编辑验证器",
  });
  if (enrollment.error) return enrollmentIssue("enrollment_failed");

  return {
    factorId: enrollment.data.id,
    issue: null,
    qrCodeDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.data.totp.qr_code)}`,
    secret: enrollment.data.totp.secret,
  };
}

export async function verifyTotp(formData: FormData): Promise<void> {
  if (!isSupabaseAuthConfigured()) redirect("/auth/mfa?error=unavailable");

  const factorId = factorIdSchema.safeParse(formData.get("factorId"));
  const code = codeSchema.safeParse(formData.get("code"));
  if (!factorId.success || !code.success) {
    redirect("/auth/mfa?error=invalid_code");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const verification = await supabase.auth.mfa.challengeAndVerify({
      code: code.data,
      factorId: factorId.data,
    });
    if (verification.error) redirect("/auth/mfa?error=verify_failed");

    await revokeCurrentInternalSession();
    const requestHeaders = await headers();
    const failure = await completeSupabaseSignIn(
      supabase,
      resolveRequestId(requestHeaders.get("x-request-id")),
    );
    if (failure) redirect(`/auth/mfa?error=${failure}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect("/auth/mfa?error=server_error");
  }
  redirect("/editorial?mfa=verified");
}

function enrollmentIssue(issue: string): TotpEnrollmentState {
  return { factorId: null, issue, qrCodeDataUrl: null, secret: null };
}
