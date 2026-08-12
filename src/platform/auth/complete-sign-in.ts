import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  establishIdentitySession,
  IdentitySessionRejectedError,
} from "@/modules/identity/public";
import { PostgresIdentitySessionStore } from "@/modules/identity/infrastructure/postgres-session-store";
import { getRuntimeSql } from "@/platform/database/runtime";

import { setInternalSessionCookie } from "./internal-session-cookie";
import { mapSupabaseUserToExternalIdentities } from "./supabase-identity";

export async function completeSupabaseSignIn(
  supabase: SupabaseClient,
  requestId: string,
): Promise<
  "identity_unsupported" | "identity_unverified" | "user_inactive" | null
> {
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

  let session;
  try {
    session = await establishIdentitySession(
      new PostgresIdentitySessionStore(getRuntimeSql()),
      { identities, requestId },
    );
  } catch (error) {
    if (error instanceof IdentitySessionRejectedError) return error.reason;
    throw error;
  }
  await setInternalSessionCookie(session.token, session.expiresAt);
  return null;
}
