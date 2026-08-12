import type { TransactionSql } from "postgres";

import type { PublicationCommit } from "../application/execute-publication";
import {
  parsePublishedRevisionSnapshot,
  type PublishedRevisionSnapshot,
} from "../domain/revision-snapshot";
import {
  planPublication,
  type PublicationPlan,
  type PublicationPointer,
  type ReviewDecision,
  type RevisionDescriptor,
} from "../domain/publication";

export type PublicationStateRow = Readonly<{
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

export type PublicationTransactionHooks = Readonly<{
  afterPublication?: (transaction: TransactionSql) => Promise<void>;
}>;

export class PublicationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationConflictError";
  }
}

export async function commitPublicationTransaction(
  transaction: TransactionSql,
  command: PublicationCommit,
  hooks: PublicationTransactionHooks = {},
): Promise<void> {
  await lockPublicationTarget(
    transaction,
    command.requested.targetKind,
    command.requested.targetId,
  );
  const revisionLock = await transaction<{ id: string }[]>`
    select id from content_revisions
    where id = ${command.requested.id}
    for update
  `;
  if (!revisionLock[0])
    throw new PublicationConflictError("revision disappeared");

  const actual = await loadPublicationState(transaction, command.requested.id);
  if (!actual) throw new PublicationConflictError("revision disappeared");
  if (await isExactReplay(transaction, command)) return;
  const replanned = planPublication({
    approvedRevisionIds:
      command.approval || actual.latestReviewDecision === "approved"
        ? new Set([actual.requested.id])
        : new Set(),
    current: actual.current,
    requested: actual.requested,
  });
  if ("issues" in replanned)
    throw new PublicationConflictError(replanned.issues.join(","));
  if (!samePlan(replanned, command.plan))
    throw new PublicationConflictError("publication state changed");

  const parsedSnapshot = parsePublishedRevisionSnapshot(
    actual.requestedSnapshot,
  );
  if (!parsedSnapshot.ok)
    throw new PublicationConflictError("publication snapshot changed");
  await validateSourceReferences(
    transaction,
    command.requested.id,
    parsedSnapshot.value,
  );

  if (command.approval) {
    const existing = await transaction<{ matches: boolean }[]>`
      select (
        revision_id = ${command.requested.id}
        and reviewer_user_id = ${command.actorUserId}
        and decision = 'approved'
        and reason = ${command.approval.reason}
      ) as matches
      from review_decisions
      where request_id = ${command.approval.requestId}
      limit 1
    `;
    if (existing[0] && !existing[0].matches)
      throw new PublicationConflictError("approval request id conflict");
    if (!existing[0]) {
      await transaction`
        insert into review_decisions (
          revision_id, reviewer_user_id, decision, reason, request_id
        ) values (
          ${command.requested.id}, ${command.actorUserId}, 'approved',
          ${command.approval.reason}, ${command.approval.requestId}
        )
      `;
    }
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

  const existingPublication = await transaction<{ matches: boolean }[]>`
    select (
      target_kind = ${command.requested.targetKind}
      and target_id = ${command.requested.targetId}
      and event_type = ${command.plan.eventType}
      and from_revision_id is not distinct from ${command.plan.fromRevisionId}
      and to_revision_id = ${command.plan.toRevisionId}
      and actor_user_id = ${command.actorUserId}
      and reason = ${command.reason}
    ) as matches
    from publication_events
    where request_id = ${command.requestId}
    limit 1
  `;
  if (existingPublication[0] && !existingPublication[0].matches)
    throw new PublicationConflictError("publication request id conflict");
  if (!existingPublication[0]) {
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
  }
  await hooks.afterPublication?.(transaction);
}

async function isExactReplay(
  sql: TransactionSql,
  command: PublicationCommit,
): Promise<boolean> {
  const events = await sql<{ matches: boolean }[]>`
    select (
      target_kind = ${command.requested.targetKind}
      and target_id = ${command.requested.targetId}
      and event_type = ${command.plan.eventType}
      and from_revision_id is not distinct from ${command.plan.fromRevisionId}
      and to_revision_id = ${command.plan.toRevisionId}
      and actor_user_id = ${command.actorUserId}
      and reason = ${command.reason}
    ) as matches
    from publication_events
    where request_id = ${command.requestId}
    limit 1
  `;
  const event = events[0];
  if (!event) return false;
  if (!event.matches)
    throw new PublicationConflictError("publication request id conflict");
  if (!command.approval) return true;

  const reviews = await sql<{ matches: boolean }[]>`
    select (
      revision_id = ${command.requested.id}
      and reviewer_user_id = ${command.actorUserId}
      and decision = 'approved'
      and reason = ${command.approval.reason}
    ) as matches
    from review_decisions
    where request_id = ${command.approval.requestId}
    limit 1
  `;
  if (!reviews[0]?.matches)
    throw new PublicationConflictError("approval request id conflict");
  return true;
}

export async function loadPublicationState(
  sql: TransactionSql,
  revisionId: string,
) {
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
      select decision from review_decisions
      where revision_id = requested.id
      order by decided_at desc, id desc limit 1
    ) latest_review on true
    left join article_publications article_pointer
      on requested.target_kind = 'article'
      and article_pointer.article_id = requested.article_id
    left join catalog_publications catalog_pointer
      on requested.target_kind = 'catalog_entity'
      and catalog_pointer.catalog_entity_id = requested.catalog_entity_id
    left join content_revisions current_revision
      on current_revision.id = coalesce(
        article_pointer.revision_id, catalog_pointer.revision_id
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

async function validateSourceReferences(
  sql: TransactionSql,
  revisionId: string,
  snapshot: PublishedRevisionSnapshot,
) {
  const referenceIds =
    snapshot.type === "article"
      ? snapshot.sourceReferenceIds
      : snapshot.facts.flatMap(({ sourceReferenceIds }) => sourceReferenceIds);
  const uniqueReferenceIds = [...new Set(referenceIds)];
  if (uniqueReferenceIds.length === 0)
    throw new PublicationConflictError("source references are required");
  const rows = await sql<{ id: string }[]>`
    select reference.id
    from revision_source_references revision_source
    join source_references reference
      on reference.id = revision_source.source_reference_id
    join sources source on source.id = reference.source_id
    where revision_source.revision_id = ${revisionId}
      and reference.id in ${sql(uniqueReferenceIds)}
    for share of revision_source, reference, source
  `;
  if (rows.length !== uniqueReferenceIds.length)
    throw new PublicationConflictError("source reference not found");
}

async function lockPublicationTarget(
  sql: TransactionSql,
  targetKind: RevisionDescriptor["targetKind"],
  targetId: string,
) {
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
