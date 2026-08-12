import type { JwtPayload, User } from "@supabase/supabase-js";

import type { VerifiedExternalIdentity } from "@/modules/identity/public";

export function mapSupabaseUserToExternalIdentities(
  user: User,
  claims: JwtPayload,
): readonly VerifiedExternalIdentity[] {
  const assuranceLevel = claims.aal === "aal2" ? "aal2" : "aal1";
  const emailNormalized = normalizeVerifiedEmail(user);
  const emailVerifiedAt = parseOptionalDate(user.email_confirmed_at);
  const displayName = resolveDisplayName(user);
  const identities: VerifiedExternalIdentity[] = [];

  for (const identity of user.identities ?? []) {
    if (identity.provider !== "email" && identity.provider !== "github") {
      continue;
    }
    identities.push({
      assuranceLevel,
      displayName,
      emailNormalized,
      emailVerifiedAt,
      provider: identity.provider === "github" ? "github" : "email_otp",
      providerSubject: identity.identity_id || identity.id,
    });
  }

  if (
    identities.length === 0 &&
    user.app_metadata.provider === "email" &&
    emailNormalized &&
    emailVerifiedAt
  ) {
    identities.push({
      assuranceLevel,
      displayName,
      emailNormalized,
      emailVerifiedAt,
      provider: "email_otp",
      providerSubject: user.id,
    });
  }

  return identities;
}

function normalizeVerifiedEmail(user: User): string | null {
  return user.email && user.email_confirmed_at
    ? user.email.trim().toLowerCase()
    : null;
}

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveDisplayName(user: User): string {
  const candidates = [
    user.user_metadata.user_name,
    user.user_metadata.preferred_username,
    user.user_metadata.full_name,
    user.email?.split("@")[0],
    "新猎人",
  ];
  const selected = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  )!;
  return selected.trim().slice(0, 80);
}
