import { createHash, timingSafeEqual } from "node:crypto";

const minimumTokenLength = 32;
const digestPattern = /^[0-9a-f]{64}$/;

export function digestSessionToken(token: string): string {
  if (token.length < minimumTokenLength) {
    throw new Error("Session tokens must contain at least 32 characters.");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifySessionToken(
  token: string,
  expectedDigest: string,
): boolean {
  if (
    token.length < minimumTokenLength ||
    !digestPattern.test(expectedDigest)
  ) {
    return false;
  }

  const actualDigest = digestSessionToken(token);
  return timingSafeEqual(
    Buffer.from(actualDigest, "hex"),
    Buffer.from(expectedDigest, "hex"),
  );
}
