import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { establishIdentitySession } from "@/modules/identity/public";
import { PostgresIdentitySessionStore } from "@/modules/identity/infrastructure/postgres-session-store";
import { getRuntimeSql } from "@/platform/database/runtime";

import { setInternalSessionCookie } from "./internal-session-cookie";
import { mapSupabaseUserToExternalIdentities } from "./supabase-identity";

export async function completeSupabaseSignIn(
  supabase: SupabaseClient,
  requestId: string,
): Promise<"identity_unsupported" | "identity_unverified" | null> {
  const [{ data: claimsData, error: claimsError }, { data: userData }] =
    await Promise.all([supabase.auth.getClaims(), supabase.auth.getUser()]);
  if (claimsError || !claimsData?.claims || !userData.user) {
    return "identity_unverified";
  }

  const identities = mapSupabaseUserToExternalIdentities(
    userData.user,
    claimsData.claims,
  );
  if (identities.length === 0) return "identity_unsupported";

  const session = await establishIdentitySession(
    new PostgresIdentitySessionStore(getRuntimeSql()),
    { identities, requestId },
  );
  await setInternalSessionCookie(session.token, session.expiresAt);
  return null;
}
