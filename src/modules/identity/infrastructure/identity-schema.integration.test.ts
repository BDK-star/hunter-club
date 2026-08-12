import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { capabilities, roles } from "../domain/authorization";

const userId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f31";

describe("identity persistence", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve("drizzle"),
    });
    await client.exec(`
      insert into users (id, display_name)
      values ('${userId}', '测试猎人');
    `);
  });

  afterEach(async () => {
    await client.close();
  });

  it("seeds the accepted role and permission contract", async () => {
    const roleResult = await client.query<{
      key: string;
      requires_second_factor: boolean;
    }>("select key, requires_second_factor from roles order by key");
    const permissionResult = await client.query<{ key: string }>(
      "select key from permissions order by key",
    );
    const grantResult = await client.query<{ count: number }>(
      "select count(*)::int as count from role_permissions",
    );

    expect(roleResult.rows.map(({ key }) => key)).toEqual([...roles].sort());
    expect(
      roleResult.rows
        .filter(({ requires_second_factor }) => requires_second_factor)
        .map(({ key }) => key),
    ).toEqual(["admin", "editor", "moderator"]);
    expect(permissionResult.rows.map(({ key }) => key)).toEqual(
      [...capabilities].sort(),
    );
    expect(grantResult.rows).toEqual([{ count: 17 }]);
  });

  it("prevents one external identity from mapping to multiple users", async () => {
    await client.exec(`
      insert into identities (user_id, provider, provider_subject, email_normalized)
      values ('${userId}', 'github', 'github-user-42', 'hunter@example.com');
    `);

    await expect(
      client.exec(`
        insert into identities (user_id, provider, provider_subject)
        values ('${userId}', 'github', 'github-user-42');
      `),
    ).rejects.toThrow();
  });

  it("requires a verified normalized email for email OTP identities", async () => {
    await expect(
      client.exec(`
        insert into identities (user_id, provider, provider_subject)
        values ('${userId}', 'email_otp', 'hunter@example.com');
      `),
    ).rejects.toThrow();

    await client.exec(`
      insert into identities (
        user_id,
        provider,
        provider_subject,
        email_normalized,
        email_verified_at
      ) values (
        '${userId}',
        'email_otp',
        'hunter@example.com',
        'hunter@example.com',
        now()
      );
    `);
    const result = await client.query<{ count: number }>(
      "select count(*)::int as count from identities where provider = 'email_otp'",
    );

    expect(result.rows).toEqual([{ count: 1 }]);
  });

  it("stores only a non-blank session digest and valid lifetime", async () => {
    await expect(
      client.exec(`
        insert into sessions (user_id, token_digest, expires_at)
        values ('${userId}', 'raw-token', now() + interval '1 day');
      `),
    ).rejects.toThrow();

    await expect(
      client.exec(`
        insert into sessions (user_id, token_digest, expires_at)
        values ('${userId}', repeat('a', 64), now() - interval '1 day');
      `),
    ).rejects.toThrow();
  });

  it("requires deleted accounts to carry a deletion timestamp", async () => {
    await expect(
      client.exec(`
        update users set status = 'deleted' where id = '${userId}';
      `),
    ).rejects.toThrow();

    await client.exec(`
      update users
      set status = 'deleted', deleted_at = now()
      where id = '${userId}';
    `);
    const result = await client.query<{ status: string }>(
      `select status from users where id = '${userId}'`,
    );

    expect(result.rows).toEqual([{ status: "deleted" }]);
  });

  it("atomically maps a provider identity to an internal member session", async () => {
    // PGlite has no Postgres.js transport, so execute the same persistence
    // contract directly and assert its database invariants here.
    const providerSubject = "github-user-42";
    await client.exec(`
      with inserted_user as (
        insert into users (display_name)
        values ('github-hunter')
        returning id
      ), inserted_identity as (
        insert into identities (
          user_id,
          provider,
          provider_subject,
          email_normalized,
          email_verified_at,
          last_authenticated_at
        )
        select
          id,
          'github',
          '${providerSubject}',
          'hunter@example.com',
          now(),
          now()
        from inserted_user
        returning user_id
      ), inserted_role as (
        insert into user_roles (user_id, role_key)
        select user_id, 'member' from inserted_identity
        returning user_id
      )
      insert into sessions (
        user_id,
        token_digest,
        assurance_level,
        expires_at
      )
      select user_id, repeat('b', 64), 'aal1', now() + interval '7 days'
      from inserted_role;
    `);
    const result = await client.query<{
      provider: string;
      role_key: string;
      session_count: number;
    }>(`
      select
        i.provider,
        ur.role_key,
        count(s.id)::int as session_count
      from identities i
      join user_roles ur on ur.user_id = i.user_id
      join sessions s on s.user_id = i.user_id
      where i.provider_subject = '${providerSubject}'
      group by i.provider, ur.role_key
    `);

    expect(result.rows).toEqual([
      { provider: "github", role_key: "member", session_count: 1 },
    ]);
  });
});
