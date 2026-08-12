import { randomBytes } from "node:crypto";

import { digestSessionToken } from "./session-token";
import {
  validateExternalIdentity,
  type VerifiedExternalIdentity,
} from "../domain/external-identity";

const sessionLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export type IdentitySessionRecord = Readonly<{
  expiresAt: Date;
  sessionId: string;
  userId: string;
}>;

export interface IdentitySessionStore {
  establish(input: {
    identities: readonly VerifiedExternalIdentity[];
    requestId: string;
    session: Readonly<{
      createdAt: Date;
      expiresAt: Date;
      tokenDigest: string;
    }>;
  }): Promise<IdentitySessionRecord>;
}

export type EstablishedIdentitySession = IdentitySessionRecord &
  Readonly<{ token: string }>;

export async function establishIdentitySession(
  store: IdentitySessionStore,
  input: Readonly<{
    identities: readonly VerifiedExternalIdentity[];
    now?: Date;
    requestId: string;
    token?: string;
  }>,
): Promise<EstablishedIdentitySession> {
  if (input.identities.length === 0) {
    throw new Error("at least one external identity is required");
  }
  const identityIssues = input.identities.flatMap((identity, index) =>
    validateExternalIdentity(identity).map((issue) => `${index}:${issue}`),
  );
  if (identityIssues.length > 0) {
    throw new Error(`invalid external identity: ${identityIssues.join(",")}`);
  }
  const identityKeys = new Set(
    input.identities.map(
      ({ provider, providerSubject }) => `${provider}:${providerSubject}`,
    ),
  );
  if (identityKeys.size !== input.identities.length) {
    throw new Error("external identities must be unique");
  }
  if (!input.requestId.trim()) throw new Error("request id is required");

  const token = input.token ?? randomBytes(32).toString("base64url");
  if (token.length < 32)
    throw new Error("session token entropy is insufficient");

  const createdAt = input.now ?? new Date();
  const record = await store.establish({
    identities: input.identities,
    requestId: input.requestId.trim(),
    session: {
      createdAt,
      expiresAt: new Date(createdAt.getTime() + sessionLifetimeMilliseconds),
      tokenDigest: digestSessionToken(token),
    },
  });

  return { ...record, token };
}
