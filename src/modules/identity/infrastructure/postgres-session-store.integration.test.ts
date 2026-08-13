import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const userId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f31";

describe("identity session status contract", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve("drizzle"),
    });
    await client.exec(`
      insert into users (id, display_name, status)
      values ('${userId}', '停用猎人', 'suspended');
      insert into identities (user_id, provider, provider_subject)
      values ('${userId}', 'github', 'suspended-github-user');
    `);
  });

  afterEach(async () => client.close());

  it("does not create a session for a non-active identity owner", async () => {
    const result = await client.query<{ id: string }>(`
      select identity.id
      from identities identity
      join users app_user on app_user.id = identity.user_id
      where identity.provider = 'github'
        and identity.provider_subject = 'suspended-github-user'
        and app_user.status = 'active'
      for update of identity, app_user
    `);

    expect(result.rows).toEqual([]);
  });
});
