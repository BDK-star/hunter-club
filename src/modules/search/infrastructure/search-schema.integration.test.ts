import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const gonId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f41";
const meruemId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f42";
const gonRevisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f81";
const meruemRevisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f82";

describe("search persistence", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve("drizzle"),
    });
    await client.exec(`
      insert into search_documents (
        target_kind,
        target_id,
        revision_id,
        kind,
        locale,
        slug,
        title,
        normalized_title,
        normalized_aliases,
        body,
        search_text,
        canon_status,
        spoiler_level,
        projection_version,
        published_at
      ) values
        (
          'catalog_entity',
          '${gonId}',
          '${gonRevisionId}',
          'character',
          'zh-CN',
          'gon-freecss',
          '小杰·富力士',
          '小杰·富力士',
          array['ゴン', 'gon'],
          '第287期猎人考试参加者。',
          '小杰·富力士 ゴン gon 第287期猎人考试参加者。',
          'canon',
          'safe',
          1,
          now()
        ),
        (
          'catalog_entity',
          '${meruemId}',
          '${meruemRevisionId}',
          'character',
          'zh-CN',
          'meruem',
          '梅路艾姆',
          '梅路艾姆',
          array['蚁王'],
          '嵌合蚁篇的重要角色。',
          '梅路艾姆 蚁王 嵌合蚁篇的重要角色。',
          'canon',
          'manga',
          1,
          now()
        );
    `);
  });

  afterEach(async () => {
    await client.close();
  });

  it("supports trigram matching across names, aliases and body", async () => {
    const result = await client.query<{ slug: string }>(`
      select slug
      from search_documents
      where search_text % '小杰 猎人考试'
         or search_text ilike '%小杰%'
      order by similarity(search_text, '小杰 猎人考试') desc
    `);

    expect(result.rows).toEqual([{ slug: "gon-freecss" }]);
  });

  it("filters by kind, canon status and an ordered spoiler boundary", async () => {
    const result = await client.query<{ slug: string }>(`
      select slug
      from search_documents
      where kind = 'character'
        and canon_status = 'canon'
        and case spoiler_level
          when 'safe' then 0
          when 'anime' then 1
          when 'manga' then 2
        end <= 1
      order by slug
    `);

    expect(result.rows).toEqual([{ slug: "gon-freecss" }]);
  });

  it("rejects article and catalog projections with contradictory kinds", async () => {
    await expect(
      client.exec(`
        insert into search_documents (
          target_kind,
          target_id,
          revision_id,
          kind,
          locale,
          slug,
          title,
          normalized_title,
          normalized_aliases,
          body,
          search_text,
          canon_status,
          spoiler_level,
          projection_version,
          published_at
        ) values (
          'article',
          gen_random_uuid(),
          gen_random_uuid(),
          'character',
          'zh-CN',
          'invalid-projection',
          '错误投影',
          '错误投影',
          array[]::text[],
          '',
          '错误投影',
          'canon',
          'safe',
          1,
          now()
        );
      `),
    ).rejects.toThrow();
  });

  it("stores only metric fingerprints, counts and non-identifying filters", async () => {
    await client.exec(`
      insert into search_query_metrics (
        query_fingerprint,
        query_length,
        filters,
        result_count,
        zero_result
      ) values (
        repeat('a', 64),
        2,
        '{"kind":["character"],"maxSpoilerLevel":"safe"}',
        0,
        true
      );
    `);
    const columns = await client.query<{ column_name: string }>(`
      select column_name
      from information_schema.columns
      where table_name = 'search_query_metrics'
      order by column_name
    `);

    expect(columns.rows.map(({ column_name }) => column_name)).not.toContain(
      "query_text",
    );
  });
});
