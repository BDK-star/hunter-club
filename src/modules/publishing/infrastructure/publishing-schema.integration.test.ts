import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const editorId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f31";
const articleId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f71";
const otherArticleId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f72";
const revisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f81";
const otherRevisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f82";

describe("publishing persistence", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve("drizzle"),
    });
    await client.exec(`
      insert into users (id, display_name)
      values ('${editorId}', '出版编辑');

      insert into articles (id, slug, created_by_user_id)
      values
        ('${articleId}', 'hunter-exam-guide', '${editorId}'),
        ('${otherArticleId}', 'nen-introduction', '${editorId}');

      insert into content_revisions (
        id,
        target_kind,
        article_id,
        sequence,
        snapshot,
        change_summary,
        created_by_user_id
      ) values
        (
          '${revisionId}',
          'article',
          '${articleId}',
          1,
          '{"title":"猎人考试指南"}',
          '建立首个版本',
          '${editorId}'
        ),
        (
          '${otherRevisionId}',
          'article',
          '${otherArticleId}',
          1,
          '{"title":"念能力入门"}',
          '建立另一篇文章',
          '${editorId}'
        );
    `);
  });

  afterEach(async () => {
    await client.close();
  });

  it("keeps revisions immutable and sequences unique per target", async () => {
    await expect(
      client.exec(`
        update content_revisions
        set change_summary = '覆盖历史版本'
        where id = '${revisionId}';
      `),
    ).rejects.toThrow(/append-only/);

    await expect(
      client.exec(`
        insert into content_revisions (
          target_kind,
          article_id,
          sequence,
          snapshot,
          change_summary,
          created_by_user_id
        ) values (
          'article',
          '${articleId}',
          1,
          '{}',
          '重复序号',
          '${editorId}'
        );
      `),
    ).rejects.toThrow();
  });

  it("rejects revisions whose target shape contradicts the target kind", async () => {
    await expect(
      client.exec(`
        insert into content_revisions (
          target_kind,
          sequence,
          snapshot,
          change_summary,
          created_by_user_id
        ) values (
          'article',
          2,
          '{}',
          '缺少目标',
          '${editorId}'
        );
      `),
    ).rejects.toThrow();
  });

  it("keeps review decisions as append-only audit records", async () => {
    const decisionId = "018f0f73-91eb-7d36-a8df-7bc8d26f8f91";
    await client.exec(`
      insert into review_decisions (
        id,
        revision_id,
        reviewer_user_id,
        decision,
        reason,
        request_id
      ) values (
        '${decisionId}',
        '${revisionId}',
        '${editorId}',
        'approved',
        '来源和剧透标记已核对',
        'review-test-1'
      );
    `);

    await expect(
      client.exec(`
        delete from review_decisions where id = '${decisionId}';
      `),
    ).rejects.toThrow(/append-only/);
  });

  it("prevents a publication pointer from crossing target boundaries", async () => {
    await expect(
      client.exec(`
        insert into article_publications (
          article_id,
          revision_id,
          published_by_user_id
        ) values (
          '${articleId}',
          '${otherRevisionId}',
          '${editorId}'
        );
      `),
    ).rejects.toThrow();

    await client.exec(`
      insert into article_publications (
        article_id,
        revision_id,
        published_by_user_id
      ) values (
        '${articleId}',
        '${revisionId}',
        '${editorId}'
      );
    `);
    const result = await client.query<{
      article_id: string;
      revision_id: string;
    }>(`
      select article_id, revision_id
      from article_publications
      where article_id = '${articleId}'
    `);

    expect(result.rows).toEqual([
      { article_id: articleId, revision_id: revisionId },
    ]);
  });

  it("requires rollback events to retain distinct before and after revisions", async () => {
    await expect(
      client.exec(`
        insert into publication_events (
          target_kind,
          target_id,
          event_type,
          from_revision_id,
          to_revision_id,
          actor_user_id,
          request_id,
          reason
        ) values (
          'article',
          '${articleId}',
          'rolled_back',
          '${revisionId}',
          '${revisionId}',
          '${editorId}',
          'publish-test-1',
          '错误的回滚事件'
        );
      `),
    ).rejects.toThrow();
  });

  it("uses the request ID as a publication command idempotency key", async () => {
    await client.exec(`
      insert into publication_events (
        target_kind,
        target_id,
        event_type,
        to_revision_id,
        actor_user_id,
        request_id,
        reason
      ) values (
        'article',
        '${articleId}',
        'published',
        '${revisionId}',
        '${editorId}',
        'publish-idempotency-1',
        '首次发布'
      );
    `);

    await expect(
      client.exec(`
        insert into publication_events (
          target_kind,
          target_id,
          event_type,
          to_revision_id,
          actor_user_id,
          request_id,
          reason
        ) values (
          'article',
          '${articleId}',
          'published',
          '${revisionId}',
          '${editorId}',
          'publish-idempotency-1',
          '重复请求'
        );
      `),
    ).rejects.toThrow();
  });
});
