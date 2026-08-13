import type { AssuranceLevel } from "./authorization";

export type ExternalIdentityProvider = "email_otp" | "github";

export type VerifiedExternalIdentity = Readonly<{
  assuranceLevel: AssuranceLevel;
  displayName: string;
  emailNormalized: string | null;
  emailVerifiedAt: Date | null;
  provider: ExternalIdentityProvider;
  providerSubject: string;
}>;

export type ExternalIdentityIssue =
  | "display_name_invalid"
  | "email_not_verified"
  | "email_shape_invalid"
  | "provider_subject_invalid";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateExternalIdentity(
  identity: VerifiedExternalIdentity,
): readonly ExternalIdentityIssue[] {
  const issues: ExternalIdentityIssue[] = [];
  const displayName = identity.displayName.trim();
  const subject = identity.providerSubject.trim();

  if (displayName.length < 1 || displayName.length > 80) {
    issues.push("display_name_invalid");
  }
  if (subject.length < 1 || subject.length > 255) {
    issues.push("provider_subject_invalid");
  }
  if (
    identity.emailNormalized !== null &&
    (identity.emailNormalized !== identity.emailNormalized.toLowerCase() ||
      identity.emailNormalized.length > 320 ||
      !emailPattern.test(identity.emailNormalized))
  ) {
    issues.push("email_shape_invalid");
  }
  if (
    identity.provider === "email_otp" &&
    (identity.emailNormalized === null || identity.emailVerifiedAt === null)
  ) {
    issues.push("email_not_verified");
  }

  return issues;
}
