import "server-only";

import type { Sql } from "postgres";

import type {
  IdentitySessionRecord,
  IdentitySessionStore,
} from "../application/establish-session";
import { IdentitySessionRejectedError } from "../application/establish-session";

type IdentityRow = Readonly<{
  id: string;
  status: "active" | "suspended" | "deleted";
  user_id: string;
}>;

export class PostgresIdentitySessionStore implements IdentitySessionStore {
  constructor(private readonly sql: Sql) {}

  async establish(
    input: Parameters<IdentitySessionStore["establish"]>[0],
  ): Promise<IdentitySessionRecord> {
    return this.sql.begin(async (transaction) => {
      const identityRows: IdentityRow[] = [];
      for (const identity of input.identities) {
        const rows = await transaction<IdentityRow[]>`
          select identity.id, identity.user_id, app_user.status
          from identities identity
          join users app_user on app_user.id = identity.user_id
          where identity.provider = ${identity.provider}
            and identity.provider_subject = ${identity.providerSubject}
          for update of identity, app_user
        `;
        identityRows.push(...rows);
      }
      const existingUserIds = new Set(
        identityRows.map(({ user_id }) => user_id),
      );
      if (existingUserIds.size > 1) {
        throw new Error("external identities belong to different users");
      }
      if (identityRows.some(({ status }) => status !== "active")) {
        throw new IdentitySessionRejectedError("user_inactive");
      }

      let userId = identityRows[0]?.user_id;
      if (!userId) {
        const [user] = await transaction<[{ id: string }]>`
          insert into users (display_name)
          values (${input.identities[0]!.displayName.trim()})
          returning id
        `;
        userId = user.id;
        await transaction`
          insert into user_roles (user_id, role_key)
          values (${userId}, 'member')
        `;
      }

      for (const identity of input.identities) {
        const rows: IdentityRow[] = await transaction<IdentityRow[]>`
          insert into identities (
            user_id,
            provider,
            provider_subject,
            email_normalized,
            email_verified_at,
            last_authenticated_at
          ) values (
            ${userId},
            ${identity.provider},
            ${identity.providerSubject},
            ${identity.emailNormalized},
            ${identity.emailVerifiedAt},
            ${input.session.createdAt}
          )
          on conflict (provider, provider_subject) do update
          set last_authenticated_at = excluded.last_authenticated_at,
              email_normalized = coalesce(excluded.email_normalized, identities.email_normalized),
              email_verified_at = coalesce(excluded.email_verified_at, identities.email_verified_at)
          returning id, user_id, 'active'::user_status as status
        `;
        const row = rows[0];
        if (!row) throw new Error("external identity was not persisted");
        if (row.user_id !== userId) {
          throw new Error("external identity conflict detected");
        }
      }

      const [session] = await transaction<
        [{ expires_at: Date; id: string; user_id: string }]
      >`
        insert into sessions (
          user_id,
          token_digest,
          assurance_level,
          created_at,
          last_seen_at,
          expires_at
        ) values (
          ${userId},
          ${input.session.tokenDigest},
          ${highestAssuranceLevel(input.identities)},
          ${input.session.createdAt},
          ${input.session.createdAt},
          ${input.session.expiresAt}
        )
        returning id, user_id, expires_at
      `;

      await transaction`
        insert into security_events (
          event_type,
          actor_user_id,
          target_user_id,
          request_id,
          metadata
        ) values (
          'session.established',
          ${userId},
          ${userId},
          ${input.requestId},
          ${transaction.json({
            assuranceLevel: highestAssuranceLevel(input.identities),
            providers: input.identities.map(({ provider }) => provider).sort(),
          })}
        )
      `;

      return {
        expiresAt: session.expires_at,
        sessionId: session.id,
        userId: session.user_id,
      };
    });
  }
}

function highestAssuranceLevel(
  identities: Parameters<IdentitySessionStore["establish"]>[0]["identities"],
): "aal1" | "aal2" {
  return identities.some(({ assuranceLevel }) => assuranceLevel === "aal2")
    ? "aal2"
    : "aal1";
}
