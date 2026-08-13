import { describe, expect, it } from "vitest";

import { mapSupabaseUserToExternalIdentities } from "./supabase-identity";

describe("Supabase identity mapping", () => {
  it("maps linked email and GitHub identities without leaking provider IDs into business data", () => {
    expect(
      mapSupabaseUserToExternalIdentities(
        {
          app_metadata: { provider: "github", providers: ["email", "github"] },
          aud: "authenticated",
          confirmed_at: "2026-08-12T00:00:00Z",
          created_at: "2026-08-12T00:00:00Z",
          email: "Hunter@Example.com",
          email_confirmed_at: "2026-08-12T00:00:00Z",
          id: "supabase-user-1",
          identities: [
            {
              id: "legacy-email-id",
              identity_id: "email-subject-1",
              provider: "email",
              user_id: "supabase-user-1",
            },
            {
              id: "legacy-github-id",
              identity_id: "github-subject-1",
              provider: "github",
              user_id: "supabase-user-1",
            },
          ],
          user_metadata: { user_name: "gon-freecss" },
        },
        {
          aal: "aal2",
          aud: "authenticated",
          exp: 1_800_000_000,
          iat: 1_799_999_000,
          iss: "https://project.supabase.co/auth/v1",
          role: "authenticated",
          session_id: "supabase-session-1",
          sub: "supabase-user-1",
        },
      ),
    ).toEqual([
      expect.objectContaining({
        assuranceLevel: "aal2",
        displayName: "gon-freecss",
        emailNormalized: "hunter@example.com",
        provider: "email_otp",
        providerSubject: "email-subject-1",
      }),
      expect.objectContaining({
        assuranceLevel: "aal2",
        provider: "github",
        providerSubject: "github-subject-1",
      }),
    ]);
  });
});
