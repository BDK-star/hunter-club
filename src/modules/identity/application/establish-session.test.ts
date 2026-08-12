import { describe, expect, it, vi } from "vitest";

import {
  establishIdentitySession,
  type IdentitySessionStore,
} from "./establish-session";
import { digestSessionToken } from "./session-token";

describe("identity session establishment", () => {
  it("passes only a digest and a bounded lifetime to persistence", async () => {
    const token = "test-session-token-with-more-than-32-characters";
    const now = new Date("2026-08-12T00:00:00.000Z");
    const store: IdentitySessionStore = {
      establish: vi.fn().mockResolvedValue({
        expiresAt: new Date("2026-08-19T00:00:00.000Z"),
        sessionId: "session-1",
        userId: "user-1",
      }),
    };

    await expect(
      establishIdentitySession(store, {
        identities: [
          {
            assuranceLevel: "aal1",
            displayName: "测试猎人",
            emailNormalized: "hunter@example.com",
            emailVerifiedAt: now,
            provider: "email_otp",
            providerSubject: "provider-user-1",
          },
        ],
        now,
        requestId: "request-1",
        token,
      }),
    ).resolves.toEqual({
      expiresAt: new Date("2026-08-19T00:00:00.000Z"),
      sessionId: "session-1",
      token,
      userId: "user-1",
    });
    expect(store.establish).toHaveBeenCalledWith(
      expect.objectContaining({
        session: {
          createdAt: now,
          expiresAt: new Date("2026-08-19T00:00:00.000Z"),
          tokenDigest: digestSessionToken(token),
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(store.establish).mock.calls)).not.toContain(
      token,
    );
  });
});
