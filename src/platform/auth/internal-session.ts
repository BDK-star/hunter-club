import "server-only";

import { cookies, headers } from "next/headers";

import {
  authorize,
  digestSessionToken,
  roles,
  type AuthorizationPrincipal,
  type Capability,
  type Role,
} from "@/modules/identity/public";
import { getRuntimeSql } from "@/platform/database/runtime";
import { resolveRequestId } from "@/shared-kernel/http/request-id";

import { internalSessionCookieName } from "./internal-session-cookie";

export type InternalSessionPrincipal = AuthorizationPrincipal &
  Readonly<{
    sessionId: string;
    userId: string;
  }>;

type SessionRow = Readonly<{
  assurance_level: "aal1" | "aal2";
  role_keys: string[] | null;
  session_id: string;
  status: "active" | "deleted" | "suspended";
  user_id: string;
}>;

export async function getInternalSessionPrincipal(): Promise<InternalSessionPrincipal | null> {
  const token = (await cookies()).get(internalSessionCookieName)?.value;
  if (!token) return null;

  const sql = getRuntimeSql();
  const rows = await sql<SessionRow[]>`
    select
      s.id as session_id,
      s.user_id,
      s.assurance_level,
      u.status,
      coalesce(
        array_agg(ur.role_key) filter (
          where ur.role_key is not null
            and (ur.expires_at is null or ur.expires_at > now())
        ),
        array[]::text[]
      ) as role_keys
    from sessions s
    join users u on u.id = s.user_id
    left join user_roles ur on ur.user_id = u.id
    where s.token_digest = ${digestSessionToken(token)}
      and s.revoked_at is null
      and s.expires_at > now()
    group by s.id, s.user_id, s.assurance_level, u.status
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  await sql`
    update sessions
    set last_seen_at = greatest(last_seen_at, now())
    where id = ${row.session_id}
  `;

  return {
    assuranceLevel: row.assurance_level,
    roles: new Set((row.role_keys ?? []).filter(isRole)),
    sessionId: row.session_id,
    status: row.status,
    userId: row.user_id,
  };
}

export async function requireInternalCapability(
  capability: Capability,
): Promise<InternalSessionPrincipal> {
  const principal = await getInternalSessionPrincipal();
  if (!principal) throw new Error("authentication_required");

  const decision = authorize(principal, capability);
  if (!decision.allowed) throw new Error(`authorization:${decision.reason}`);
  return principal;
}

export async function revokeCurrentInternalSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(internalSessionCookieName)?.value;
  if (!token) return;

  const requestHeaders = await headers();
  const requestId = resolveRequestId(requestHeaders.get("x-request-id"));
  const sql = getRuntimeSql();
  await sql.begin(async (transaction) => {
    const sessions = await transaction<{ id: string; user_id: string }[]>`
      update sessions
      set revoked_at = coalesce(revoked_at, now())
      where token_digest = ${digestSessionToken(token)}
      returning id, user_id
    `;
    const session = sessions[0];
    if (!session) return;

    await transaction`
      insert into security_events (
        event_type,
        actor_user_id,
        target_user_id,
        request_id,
        metadata
      ) values (
        'session.revoked',
        ${session.user_id},
        ${session.user_id},
        ${requestId},
        ${transaction.json({ sessionId: session.id })}
      )
    `;
  });
}

function isRole(value: string): value is Role {
  return roles.some((role) => role === value);
}
