import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresPublicationStore } from "./postgres-publication-store";

const databaseUrl = process.env.DATABASE_URL;
const runPostgresAdapterTests = process.env.RUN_POSTGRES_ADAPTER_TESTS === "1";
const describeWithPostgres = runPostgresAdapterTests ? describe : describe.skip;
const editorId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f31";
const entityId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f51";
const sourceId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f61";
const referenceId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f62";
const revisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f71";

describeWithPostgres("Postgres publication store", () => {
  let sql: Sql;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    sql = postgres(databaseUrl!, { max: 4, prepare: false });
    await sql.unsafe(setupSql());
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("rolls approval, pointer and event back when projection fails", async () => {
    await resetFixture(sql);
    await expect(
      new PostgresPublicationStore(sql, async () => {
        throw new Error("projection failed");
      }).commit(command()),
    ).rejects.toThrow("projection failed");
    await expect(countRows(sql)).resolves.toEqual({
      events: 0,
      pointers: 0,
      reviews: 0,
    });
  });

  it("publishes once and treats an exact command replay as idempotent", async () => {
    await resetFixture(sql);
    const store = new PostgresPublicationStore(sql);
    await store.commit(command());
    await store.commit(command());

    await expect(countRows(sql)).resolves.toEqual({
      events: 1,
      pointers: 1,
      reviews: 1,
    });
  });

  it("rejects a source ID that is not associated with the revision", async () => {
    await resetFixture(sql);
    await sql`delete from revision_source_references where revision_id = ${revisionId}`;

    await expect(
      new PostgresPublicationStore(sql).commit(command()),
    ).rejects.toThrow("source reference not found");
    await expect(countRows(sql)).resolves.toEqual({
      events: 0,
      pointers: 0,
      reviews: 0,
    });
  });
});

function command() {
  return {
    actorUserId: editorId,
    approval: { reason: "来源和剧透边界已核对", requestId: "command-1:review" },
    plan: {
      eventType: "published" as const,
      fromRevisionId: null,
      toRevisionId: revisionId,
    },
    reason: "来源和剧透边界已核对",
    requestId: "command-1:publish",
    requested: {
      id: revisionId,
      sequence: 1,
      targetId: entityId,
      targetKind: "catalog_entity" as const,
    },
  };
}

async function resetFixture(sql: Sql) {
  await sql.unsafe(`
    truncate table publication_events, catalog_publications,
      review_decisions, revision_source_references, content_revisions,
      catalog_entities, source_references, sources, users cascade;
  `);
  await sql.unsafe(setupSql());
}

async function countRows(sql: Sql) {
  const [row] = await sql<
    [{ events: number; pointers: number; reviews: number }]
  >`
    select
      (select count(*)::int from review_decisions) as reviews,
      (select count(*)::int from catalog_publications) as pointers,
      (select count(*)::int from publication_events) as events
  `;
  return row;
}

function setupSql() {
  return `
    insert into users (id, display_name) values ('${editorId}', '事务编辑')
    on conflict (id) do nothing;
    insert into sources (id, type, title, language, created_by_user_id)
    values ('${sourceId}', 'manga', 'HUNTER×HUNTER 1', 'ja', '${editorId}')
    on conflict (id) do nothing;
    insert into source_references (id, source_id, locator_type, locator)
    values ('${referenceId}', '${sourceId}', 'section', 'あらすじ・概要')
    on conflict (id) do nothing;
    insert into catalog_entities (id, kind, slug, created_by_user_id)
    values ('${entityId}', 'character', 'gon-freecss', '${editorId}')
    on conflict (id) do nothing;
    insert into content_revisions (
      id, target_kind, catalog_entity_id, sequence, snapshot,
      change_summary, created_by_user_id
    ) values (
      '${revisionId}', 'catalog_entity', '${entityId}', 1,
      '{"facts":[{"canonStatus":"canon","sourceReferenceIds":["${referenceId}"],"spoilerLevel":"safe","statement":"小杰踏上旅程。"}],"kind":"character","translations":[{"aliases":[],"locale":"zh-CN","summary":"来自鲸鱼岛。","title":"小杰"}],"type":"catalog_entity"}',
      '建立首版', '${editorId}'
    ) on conflict (id) do nothing;
    insert into revision_source_references (revision_id, source_reference_id)
    values ('${revisionId}', '${referenceId}')
    on conflict (revision_id, source_reference_id) do nothing;
  `;
}
