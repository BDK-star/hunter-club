import { describe, expect, it } from "vitest";

import { digestSessionToken, verifySessionToken } from "./session-token";

describe("session token digests", () => {
  const token = "hunter-club-session-token-with-256-bits-of-entropy";

  it("stores a deterministic SHA-256 digest instead of the bearer token", () => {
    const digest = digestSessionToken(token);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(token);
    expect(verifySessionToken(token, digest)).toBe(true);
  });

  it("rejects short tokens and malformed stored digests", () => {
    expect(() => digestSessionToken("too-short")).toThrow(
      /at least 32 characters/,
    );
    expect(verifySessionToken(token, "not-a-digest")).toBe(false);
    expect(
      verifySessionToken(`${token}-wrong`, digestSessionToken(token)),
    ).toBe(false);
  });
});
