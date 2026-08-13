import "server-only";

import type { InternalSessionPrincipal } from "@/platform/auth/internal-session";
import { getRuntimeSql } from "@/platform/database/runtime";
import {
  executeApprovalPublication,
  executePublication,
  loadEditorialQueue,
  recordReview,
  type PublicationOperation,
  type ReviewDecision,
} from "@/modules/publishing/public";
import { PostgresEditorialStore } from "@/modules/publishing/infrastructure/postgres-editorial-store";
import { PostgresPublicationStore } from "@/modules/publishing/infrastructure/postgres-publication-store";
import { rebuildPostgresSearchProjectionInTransaction } from "@/modules/search/infrastructure/postgres-projection-rebuilder";

export async function loadRuntimeEditorialQueue(
  principal: InternalSessionPrincipal,
) {
  return loadEditorialQueue(
    new PostgresEditorialStore(getRuntimeSql()),
    principal,
  );
}

export async function recordRuntimeReview(input: {
  decision: ReviewDecision;
  principal: InternalSessionPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}) {
  return recordReview(new PostgresEditorialStore(getRuntimeSql()), {
    actorUserId: input.principal.userId,
    ...input,
  });
}

export async function executeRuntimePublication(input: {
  operation: PublicationOperation;
  principal: InternalSessionPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}) {
  const sql = getRuntimeSql();
  return executePublication(
    new PostgresPublicationStore(sql, async (transaction) => {
      await rebuildPostgresSearchProjectionInTransaction(transaction);
    }),
    {
      actorUserId: input.principal.userId,
      ...input,
    },
  );
}

export async function executeRuntimeApprovalPublication(input: {
  principal: InternalSessionPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}) {
  const sql = getRuntimeSql();
  return executeApprovalPublication(
    new PostgresPublicationStore(sql, async (transaction) => {
      await rebuildPostgresSearchProjectionInTransaction(transaction);
    }),
    { actorUserId: input.principal.userId, ...input },
  );
}
