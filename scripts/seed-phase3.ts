import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

import { parsePublishedRevisionSnapshot } from "../src/modules/publishing/domain/revision-snapshot";
import { parseServerEnvironment } from "../src/platform/config/server";

config({ path: ".env.local", quiet: true });
const environment = parseServerEnvironment(process.env);
const actorUserId = z.uuid().parse(process.env.PHASE3_EDITOR_USER_ID);

const ids = {
  claim: "1b72d252-a23c-46d0-9a75-1a38f523aca1",
  entity: "1b72d252-a23c-46d0-9a75-1a38f523aca2",
  reference: "1b72d252-a23c-46d0-9a75-1a38f523aca3",
  revision: "1b72d252-a23c-46d0-9a75-1a38f523aca4",
  source: "1b72d252-a23c-46d0-9a75-1a38f523aca5",
  translation: "1b72d252-a23c-46d0-9a75-1a38f523aca6",
} as const;

const snapshot = {
  facts: [
    {
      canonStatus: "canon",
      sourceReferenceIds: [ids.reference],
      spoilerLevel: "safe",
      statement: "小杰为了成为像父亲一样的猎人并寻找父亲，踏上了旅程。",
    },
  ],
  kind: "character",
  translations: [
    {
      aliases: ["冈·富力士"],
      locale: "zh-CN",
      summary: "从鲸鱼岛出发、以成为猎人并寻找父亲为目标的少年。",
      title: "小杰·富力士",
    },
  ],
  type: "catalog_entity",
} as const;

const parsedSnapshot = parsePublishedRevisionSnapshot(snapshot);
if (!parsedSnapshot.ok) {
  throw new Error(
    `Phase 3 seed snapshot is invalid: ${parsedSnapshot.issues
      .map(({ code, path }) => `${path}:${code}`)
      .join(",")}`,
  );
}

const client = postgres(environment.databaseMigrationUrl, {
  max: 1,
  prepare: false,
});

try {
  await client.begin(async (transaction) => {
    const actors = await transaction<{ id: string }[]>`
      select id from users where id = ${actorUserId} and status = 'active'
    `;
    if (!actors[0]) {
      throw new Error(
        "PHASE3_EDITOR_USER_ID must reference an active internal user",
      );
    }

    await transaction`
      insert into sources (
        id, type, title, language, publisher, external_url,
        published_on, created_by_user_id
      ) values (
        ${ids.source}, 'manga', 'HUNTER×HUNTER 1', 'ja', '集英社',
        'https://books.shueisha.co.jp/items/contents.html?isbn=978-4-08-872571-0',
        '1998-06-04', ${actorUserId}
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into source_references (
        id, source_id, locator_type, locator, note
      ) values (
        ${ids.reference}, ${ids.source}, 'section', 'あらすじ・概要',
        '集英社单行本第1卷官方书目页的故事概要'
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into catalog_entities (
        id, kind, slug, state, created_by_user_id
      ) values (
        ${ids.entity}, 'character', 'gon-freecss', 'draft', ${actorUserId}
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into entity_translations (
        id, entity_id, locale, name, summary, is_primary
      ) values (
        ${ids.translation}, ${ids.entity}, 'zh-CN', '小杰·富力士',
        '从鲸鱼岛出发、以成为猎人并寻找父亲为目标的少年。', true
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into entity_aliases (
        entity_id, locale, alias, normalized_alias
      ) values (
        ${ids.entity}, 'zh-CN', '冈·富力士', '冈·富力士'
      )
      on conflict (entity_id, locale, normalized_alias) do nothing
    `;
    await transaction`
      insert into fact_claims (
        id, entity_id, predicate, statement, canon_status,
        spoiler_level, verified_at, created_by_user_id
      ) values (
        ${ids.claim}, ${ids.entity}, 'character.goal',
        '小杰为了成为像父亲一样的猎人并寻找父亲，踏上了旅程。',
        'canon', 'safe', now(), ${actorUserId}
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into claim_sources (claim_id, source_reference_id, assertion)
      values (${ids.claim}, ${ids.reference}, 'supports')
      on conflict (claim_id, source_reference_id) do nothing
    `;
    await transaction`
      insert into content_revisions (
        id, target_kind, catalog_entity_id, sequence, schema_version,
        snapshot, change_summary, created_by_user_id
      ) values (
        ${ids.revision}, 'catalog_entity', ${ids.entity}, 1, 1,
        ${transaction.json(parsedSnapshot.value)},
        '建立首项带官方书目来源的低剧透角色资料',
        ${actorUserId}
      )
      on conflict (id) do nothing
    `;
    await transaction`
      insert into revision_source_references (revision_id, source_reference_id)
      values (${ids.revision}, ${ids.reference})
      on conflict (revision_id, source_reference_id) do nothing
    `;
  });
  process.stdout.write(
    `Phase 3 draft seed is ready: revision ${ids.revision}. Review and publish it through /editorial.\n`,
  );
} finally {
  await client.end();
}
