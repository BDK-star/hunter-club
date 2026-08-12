import "server-only";

import type { Sql } from "postgres";

import { parsePublishedRevisionSnapshot } from "@/modules/publishing/public";

import { projectPublishedRevision } from "../application/published-revision-projection";
import type { SearchProjectionDocument } from "../application/projection";

type PublishedRevisionRow = Readonly<{
  published_at: Date;
  revision_id: string;
  schema_version: number;
  slug: string;
  snapshot: unknown;
  target_id: string;
}>;

export type ProjectionRebuildResult = Readonly<{
  documentCount: number;
  revisionCount: number;
}>;

export async function rebuildPostgresSearchProjection(
  sql: Sql,
): Promise<ProjectionRebuildResult> {
  const rows = await sql<PublishedRevisionRow[]>`
    select
      revision.id as revision_id,
      revision.schema_version,
      revision.snapshot,
      article.id as target_id,
      article.slug,
      pointer.published_at
    from article_publications pointer
    join articles article on article.id = pointer.article_id
    join content_revisions revision on revision.id = pointer.revision_id
    where article.state = 'published'
    union all
    select
      revision.id as revision_id,
      revision.schema_version,
      revision.snapshot,
      entity.id as target_id,
      entity.slug,
      pointer.published_at
    from catalog_publications pointer
    join catalog_entities entity on entity.id = pointer.catalog_entity_id
    join content_revisions revision on revision.id = pointer.revision_id
    where entity.state = 'active'
    order by target_id
  `;

  const documents: SearchProjectionDocument[] = [];
  for (const row of rows) {
    if (row.schema_version !== 1) {
      throw new Error(
        `unsupported revision schema version ${row.schema_version} for ${row.revision_id}`,
      );
    }
    const parsed = parsePublishedRevisionSnapshot(row.snapshot);
    if (!parsed.ok) {
      throw new Error(
        `invalid published revision ${row.revision_id}: ${parsed.issues
          .map(({ code, path }) => `${path}:${code}`)
          .join(",")}`,
      );
    }
    documents.push(
      ...projectPublishedRevision({
        publishedAt: row.published_at,
        revisionId: row.revision_id,
        slug: row.slug,
        snapshot: parsed.value,
        targetId: row.target_id,
      }),
    );
  }

  await sql.begin(async (transaction) => {
    await transaction`delete from search_documents`;
    for (const document of documents) {
      await transaction`
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
          published_at,
          projected_at
        ) values (
          ${document.targetKind},
          ${document.targetId},
          ${document.revisionId},
          ${document.kind},
          ${document.locale},
          ${document.slug},
          ${document.title},
          ${document.normalizedTitle},
          ${transaction.array([...document.normalizedAliases])},
          ${document.body},
          ${document.searchText},
          ${document.canonStatus},
          ${document.spoilerLevel},
          ${document.projectionVersion},
          ${document.publishedAt},
          now()
        )
      `;
    }
  });

  return { documentCount: documents.length, revisionCount: rows.length };
}
