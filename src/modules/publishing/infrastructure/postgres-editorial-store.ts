import "server-only";

import type { Sql } from "postgres";

import type {
  EditorialCandidate,
  EditorialQueueStore,
} from "../application/load-editorial-queue";
import type { ReviewStore } from "../application/record-review";

type EditorialCandidateRow = Readonly<{
  change_summary: string;
  created_at: Date;
  current_revision_id: string | null;
  current_snapshot: unknown;
  draft_snapshot: unknown;
  latest_review_decision: "approved" | "changes_requested" | "rejected" | null;
  revision_id: string;
  sequence: number;
  slug: string;
  target_id: string;
  target_kind: "article" | "catalog_entity";
}>;

export class PostgresEditorialStore
  implements EditorialQueueStore, ReviewStore
{
  constructor(private readonly sql: Sql) {}

  async loadCandidates(): Promise<readonly EditorialCandidate[]> {
    const rows = await this.sql<EditorialCandidateRow[]>`
      with ranked_revisions as (
        select
          revision.*,
          row_number() over (
            partition by revision.target_kind,
              coalesce(revision.article_id, revision.catalog_entity_id)
            order by revision.sequence desc
          ) as target_rank
        from content_revisions revision
      )
      select
        requested.id as revision_id,
        requested.target_kind,
        coalesce(requested.article_id, requested.catalog_entity_id) as target_id,
        coalesce(article.slug, entity.slug) as slug,
        requested.sequence,
        requested.snapshot as draft_snapshot,
        requested.change_summary,
        requested.created_at,
        current_revision.id as current_revision_id,
        current_revision.snapshot as current_snapshot,
        latest_review.decision as latest_review_decision
      from ranked_revisions requested
      left join articles article on article.id = requested.article_id
      left join catalog_entities entity on entity.id = requested.catalog_entity_id
      left join article_publications article_pointer
        on requested.target_kind = 'article'
        and article_pointer.article_id = requested.article_id
      left join catalog_publications catalog_pointer
        on requested.target_kind = 'catalog_entity'
        and catalog_pointer.catalog_entity_id = requested.catalog_entity_id
      left join content_revisions current_revision
        on current_revision.id = coalesce(
          article_pointer.revision_id,
          catalog_pointer.revision_id
        )
      left join lateral (
        select decision
        from review_decisions
        where revision_id = requested.id
        order by decided_at desc, id desc
        limit 1
      ) latest_review on true
      where requested.target_rank = 1
        and requested.id is distinct from current_revision.id
      order by requested.created_at asc, requested.id asc
    `;

    return rows.map((row) => ({
      changeSummary: row.change_summary,
      createdAt: row.created_at,
      currentRevisionId: row.current_revision_id,
      currentSnapshot: row.current_snapshot,
      draftSnapshot: row.draft_snapshot,
      latestReviewDecision: row.latest_review_decision,
      revisionId: row.revision_id,
      sequence: row.sequence,
      slug: row.slug,
      targetId: row.target_id,
      targetKind: row.target_kind,
    }));
  }

  async append(
    command: Parameters<ReviewStore["append"]>[0],
  ): Promise<boolean> {
    const inserted = await this.sql<{ id: string }[]>`
      insert into review_decisions (
        revision_id,
        reviewer_user_id,
        decision,
        reason,
        request_id
      )
      select
        revision.id,
        ${command.actorUserId},
        ${command.decision},
        ${command.reason},
        ${command.requestId}
      from content_revisions revision
      where revision.id = ${command.revisionId}
      on conflict (request_id) do nothing
      returning id
    `;
    if (inserted[0]) return true;

    const existing = await this.sql<{ matches: boolean }[]>`
      select (
        revision_id = ${command.revisionId}
        and reviewer_user_id = ${command.actorUserId}
        and decision = ${command.decision}
        and reason = ${command.reason}
      ) as matches
      from review_decisions
      where request_id = ${command.requestId}
      limit 1
    `;
    return existing[0]?.matches ?? false;
  }
}
