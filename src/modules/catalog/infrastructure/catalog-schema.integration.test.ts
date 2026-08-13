import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const editorId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f31";
const gonId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f41";
const killuaId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f42";
const sourceId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f51";
const referenceId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f52";

describe("catalog persistence", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve("drizzle"),
    });
    await client.exec(`
      insert into users (id, display_name)
      values ('${editorId}', '资料编辑');

      insert into catalog_entities (id, kind, slug, created_by_user_id)
      values
        ('${gonId}', 'character', 'gon-freecss', '${editorId}'),
        ('${killuaId}', 'character', 'killua-zoldyck', '${editorId}');

      insert into sources (
        id,
        type,
        title,
        language,
        publisher,
        created_by_user_id
      ) values (
        '${sourceId}',
        'manga',
        'HUNTER×HUNTER 漫画',
        'ja',
        '集英社',
        '${editorId}'
      );

      insert into source_references (id, source_id, locator_type, locator)
      values ('${referenceId}', '${sourceId}', 'chapter', '第1话');
    `);
  });

  afterEach(async () => {
    await client.close();
  });

  it("accepts exactly the four first-release entity kinds", async () => {
    const result = await client.query<{ enumlabel: string }>(`
      select enumlabel
      from pg_enum
      join pg_type on pg_type.oid = pg_enum.enumtypid
      where pg_type.typname = 'catalog_entity_kind'
      order by enumsortorder
    `);

    expect(result.rows.map(({ enumlabel }) => enumlabel)).toEqual([
      "character",
      "nen_ability",
      "organization",
      "story_arc",
    ]);
  });

  it("keeps one translation per locale and one primary translation", async () => {
    await client.exec(`
      insert into entity_translations (entity_id, locale, name, is_primary)
      values ('${gonId}', 'zh-CN', '小杰·富力士', true);
    `);

    await expect(
      client.exec(`
        insert into entity_translations (entity_id, locale, name)
        values ('${gonId}', 'zh-CN', '杰·富力士');
      `),
    ).rejects.toThrow();
    await expect(
      client.exec(`
        insert into entity_translations (entity_id, locale, name, is_primary)
        values ('${gonId}', 'ja', 'ゴン＝フリークス', true);
      `),
    ).rejects.toThrow();
  });

  it("deduplicates normalized aliases and reusable source locators", async () => {
    await client.exec(`
      insert into entity_aliases (entity_id, locale, alias, normalized_alias)
      values ('${gonId}', 'zh-CN', '小杰', '小杰');
    `);

    await expect(
      client.exec(`
        insert into entity_aliases (entity_id, locale, alias, normalized_alias)
        values ('${gonId}', 'zh-CN', '杰', '小杰');
      `),
    ).rejects.toThrow();
    await expect(
      client.exec(`
        insert into source_references (source_id, locator_type, locator)
        values ('${sourceId}', 'chapter', '第1话');
      `),
    ).rejects.toThrow();
  });

  it("links a verified fact to a reusable source reference", async () => {
    const claimId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f61";
    await client.exec(`
      insert into fact_claims (
        id,
        entity_id,
        predicate,
        statement,
        canon_status,
        spoiler_level,
        verified_at,
        created_by_user_id
      ) values (
        '${claimId}',
        '${gonId}',
        'hunter_exam.participant',
        '小杰参加了第287期猎人考试。',
        'canon',
        'safe',
        now(),
        '${editorId}'
      );

      insert into claim_sources (claim_id, source_reference_id, assertion)
      values ('${claimId}', '${referenceId}', 'supports');
    `);

    const result = await client.query<{
      locator: string;
      spoiler_level: string;
      statement: string;
    }>(`
      select r.locator, c.spoiler_level, c.statement
      from fact_claims c
      join claim_sources cs on cs.claim_id = c.id
      join source_references r on r.id = cs.source_reference_id
      where c.id = '${claimId}'
    `);

    expect(result.rows).toEqual([
      {
        locator: "第1话",
        spoiler_level: "safe",
        statement: "小杰参加了第287期猎人考试。",
      },
    ]);
  });

  it("rejects self-relations and future verification timestamps", async () => {
    await expect(
      client.exec(`
        insert into entity_relations (
          source_entity_id,
          target_entity_id,
          relation_type,
          canon_status,
          spoiler_level,
          verified_at,
          created_by_user_id
        ) values (
          '${gonId}',
          '${gonId}',
          'friend_of',
          'canon',
          'anime',
          now(),
          '${editorId}'
        );
      `),
    ).rejects.toThrow();

    await expect(
      client.exec(`
        insert into entity_relations (
          source_entity_id,
          target_entity_id,
          relation_type,
          canon_status,
          spoiler_level,
          verified_at,
          created_by_user_id
        ) values (
          '${gonId}',
          '${killuaId}',
          'friend_of',
          'canon',
          'anime',
          now() + interval '1 day',
          '${editorId}'
        );
      `),
    ).rejects.toThrow();
  });
});
