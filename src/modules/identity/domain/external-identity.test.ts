import { describe, expect, it } from "vitest";

import { validateExternalIdentity } from "./external-identity";

describe("external identity contract", () => {
  it("accepts a verified email OTP identity", () => {
    expect(
      validateExternalIdentity({
        assuranceLevel: "aal1",
        displayName: "猎人考生",
        emailNormalized: "hunter@example.com",
        emailVerifiedAt: new Date("2026-08-12T00:00:00Z"),
        provider: "email_otp",
        providerSubject: "provider-user-1",
      }),
    ).toEqual([]);
  });

  it("rejects unverified email identities and malformed provider data", () => {
    expect(
      validateExternalIdentity({
        assuranceLevel: "aal1",
        displayName: " ",
        emailNormalized: "Hunter@Example.com",
        emailVerifiedAt: null,
        provider: "email_otp",
        providerSubject: " ",
      }),
    ).toEqual([
      "display_name_invalid",
      "provider_subject_invalid",
      "email_shape_invalid",
      "email_not_verified",
    ]);
  });
});
