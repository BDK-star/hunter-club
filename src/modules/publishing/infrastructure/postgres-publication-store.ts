import "server-only";

import type { Sql, TransactionSql } from "postgres";

import type {
  PublicationCommit,
  PublicationState,
  PublicationStore,
} from "../application/execute-publication";
import {
  planPublication,
  type PublicationPlan,
  type PublicationPointer,
  type ReviewDecision,
  type RevisionDescriptor,
} from "../domain/publication";

type PublicationStateRow = Readonly<{
  current_revision_id: string | null;
  current_sequence: number | null;
  latest_review_decision: ReviewDecision | null;
  revision_id: string;
  sequence: number;
  schema_version: number;
  snapshot: unknown;
  target_id: string;
  target_kind: "article" | "catalog_entity";
}>;

export class PublicationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationConflictError";
  }
}

export class PostgresPublicationStore implements PublicationStore {
  constructor(
    private readonly sql: Sql,
    private readonly afterPublication?: (
      transaction: TransactionSql,
    ) => Promise<void>,
  ) {}

  async loadState(revisionId: string): Promise<PublicationState | null> {
    return loadPublicationState(this.sql, revisionId);
  }

  async commit(command: PublicationCommit): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const sql = transaction;
      await lockPublicationTarget(
        sql,
        command.requested.targetKind,
        command.requested.targetId,
      );
      const revisionLock = await sql<{ id: string }[]>`
        select id
        from content_revisions
        where id = ${command.requested.id}
        for update
      `;
      if (!revisionLock[0]) {
        throw new PublicationConflictError("revision disappeared");
      }
      const actual = await loadPublicationState(sql, command.requested.id);
      if (!actual) throw new PublicationConflictError("revision disappeared");

      const replanned = planPublication({
        approvedRevisionIds:
          actual.latestReviewDecision === "approved"
            ? new Set([actual.requested.id])
            : new Set(),
        current: actual.current,
        requested: actual.requested,
      });
      if ("issues" in replanned) {
        throw new PublicationConflictError(replanned.issues.join(","));
      }
      if (!samePlan(replanned, command.plan)) {
        throw new PublicationConflictError("publication state changed");
      }

      if (command.requested.targetKind === "article") {
        await transaction`
          insert into article_publications (
            article_id, revision_id, published_by_user_id, published_at
          ) values (
            ${command.requested.targetId}, ${command.requested.id},
            ${command.actorUserId}, now()
          )
          on conflict (article_id) do update
          set revision_id = excluded.revision_id,
              published_by_user_id = excluded.published_by_user_id,
              published_at = excluded.published_at
        `;
        await transaction`
          update articles set state = 'published', updated_at = now()
          where id = ${command.requested.targetId}
        `;
      } else {
        await transaction`
          insert into catalog_publications (
            catalog_entity_id, revision_id, published_by_user_id, published_at
          ) values (
            ${command.requested.targetId}, ${command.requested.id},
            ${command.actorUserId}, now()
          )
          on conflict (catalog_entity_id) do update
          set revision_id = excluded.revision_id,
              published_by_user_id = excluded.published_by_user_id,
              published_at = excluded.published_at
        `;
        await transaction`
          update catalog_entities set state = 'active', updated_at = now()
          where id = ${command.requested.targetId}
        `;
      }

      await transaction`
        insert into publication_events (
          target_kind, target_id, event_type, from_revision_id,
          to_revision_id, actor_user_id, request_id, reason
        ) values (
          ${command.requested.targetKind}, ${command.requested.targetId},
          ${command.plan.eventType}, ${command.plan.fromRevisionId},
          ${command.plan.toRevisionId}, ${command.actorUserId},
          ${command.requestId}, ${command.reason}
        )
      `;
      await this.afterPublication?.(transaction);
    });
  }
}

async function loadPublicationState(
  sql: Sql | TransactionSql,
  revisionId: string,
): Promise<PublicationState | null> {
  const rows = await sql<PublicationStateRow[]>`
    select
      requested.id as revision_id,
      requested.target_kind,
      coalesce(requested.article_id, requested.catalog_entity_id) as target_id,
      requested.sequence,
      requested.schema_version,
      requested.snapshot,
      latest_review.decision as latest_review_decision,
      current_revision.id as current_revision_id,
      current_revision.sequence as current_sequence
    from content_revisions requested
    left join lateral (
      select decision
      from review_decisions
      where revision_id = requested.id
      order by decided_at desc, id desc
      limit 1
    ) latest_review on true
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
    where requested.id = ${revisionId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  const requested: RevisionDescriptor = {
    id: row.revision_id,
    sequence: row.sequence,
    targetId: row.target_id,
    targetKind: row.target_kind,
  };
  const current: PublicationPointer | null =
    row.current_revision_id && row.current_sequence !== null
      ? {
          revisionId: row.current_revision_id,
          sequence: row.current_sequence,
          targetId: row.target_id,
          targetKind: row.target_kind,
        }
      : null;
  return {
    current,
    latestReviewDecision: row.latest_review_decision,
    requested,
    requestedSchemaVersion: row.schema_version,
    requestedSnapshot: row.snapshot,
  };
}

async function lockPublicationTarget(
  sql: Sql | TransactionSql,
  targetKind: RevisionDescriptor["targetKind"],
  targetId: string,
): Promise<void> {
  const rows =
    targetKind === "article"
      ? await sql<{ id: string }[]>`
          select id from articles where id = ${targetId} for update
        `
      : await sql<{ id: string }[]>`
          select id from catalog_entities where id = ${targetId} for update
        `;
  if (!rows[0]) throw new PublicationConflictError("target disappeared");
}

function samePlan(left: PublicationPlan, right: PublicationPlan): boolean {
  return (
    left.eventType === right.eventType &&
    left.fromRevisionId === right.fromRevisionId &&
    left.toRevisionId === right.toRevisionId
  );
}
