import type { AuthorizationPrincipal } from "@/modules/identity/public";

import { authorizePublication } from "./authorize-publication";
import { parsePublishedRevisionSnapshot } from "../domain/revision-snapshot";
import {
  planPublication,
  type PublicationPlan,
  type PublicationPointer,
  type ReviewDecision,
  type RevisionDescriptor,
} from "../domain/publication";

export type PublicationOperation = "publish" | "rollback";

export type PublicationCommand = Readonly<{
  actorUserId: string;
  operation: PublicationOperation;
  principal: AuthorizationPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}>;

export type PublicationState = Readonly<{
  current: PublicationPointer | null;
  latestReviewDecision: ReviewDecision | null;
  requested: RevisionDescriptor;
  requestedSchemaVersion: number;
  requestedSnapshot: unknown;
}>;

export type PublicationCommit = Readonly<{
  approval?: Readonly<{ reason: string; requestId: string }>;
  actorUserId: string;
  plan: PublicationPlan;
  reason: string;
  requestId: string;
  requested: RevisionDescriptor;
}>;

export type ApprovalPublicationCommand = Readonly<{
  actorUserId: string;
  principal: AuthorizationPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}>;

export interface PublicationStore {
  /** Load the requested revision, its latest review decision and current pointer. */
  loadState(revisionId: string): Promise<PublicationState | null>;

  /** Move the pointer and append its event in one database transaction. */
  commit(command: PublicationCommit): Promise<void>;
}

export type PublicationExecution =
  | Readonly<{ ok: true; plan: PublicationPlan }>
  | Readonly<{
      issues: readonly string[];
      ok: false;
    }>;

export async function executePublication(
  store: PublicationStore,
  command: PublicationCommand,
): Promise<PublicationExecution> {
  const authorization = authorizePublication(
    command.principal,
    command.operation,
  );
  if (!authorization.allowed) {
    return { issues: [`authorization:${authorization.reason}`], ok: false };
  }

  const inputIssues = [
    command.actorUserId.trim() ? null : "actor_required",
    command.requestId.trim() ? null : "request_id_required",
    command.reason.trim() ? null : "reason_required",
  ].filter((issue): issue is string => issue !== null);
  if (inputIssues.length > 0) return { issues: inputIssues, ok: false };

  const state = await store.loadState(command.revisionId);
  if (!state) return { issues: ["revision_not_found"], ok: false };

  if (state.requestedSchemaVersion !== 1) {
    return {
      issues: [
        `snapshot:schema_version:unsupported_${state.requestedSchemaVersion}`,
      ],
      ok: false,
    };
  }
  const snapshot = parsePublishedRevisionSnapshot(state.requestedSnapshot);
  if (!snapshot.ok) {
    return {
      issues: snapshot.issues.map(
        ({ code, path }) => `snapshot:${path}:${code}`,
      ),
      ok: false,
    };
  }

  const planned = planPublication({
    approvedRevisionIds:
      state.latestReviewDecision === "approved"
        ? new Set([state.requested.id])
        : new Set(),
    current: state.current,
    requested: state.requested,
  });
  if ("issues" in planned) return { issues: planned.issues, ok: false };

  if (planned.eventType !== operationEventType(command.operation)) {
    return { issues: ["operation_pointer_direction_mismatch"], ok: false };
  }

  await store.commit({
    actorUserId: command.actorUserId,
    plan: planned,
    reason: command.reason.trim(),
    requestId: command.requestId.trim(),
    requested: state.requested,
  });
  return { ok: true, plan: planned };
}

/** Approve a revision and publish it through one transactional store commit. */
export async function executeApprovalPublication(
  store: PublicationStore,
  command: ApprovalPublicationCommand,
): Promise<PublicationExecution> {
  const reviewAuthorization = authorizePublication(
    command.principal,
    "review_and_publish",
  );
  if (!reviewAuthorization.allowed) {
    return {
      issues: [`authorization:${reviewAuthorization.reason}`],
      ok: false,
    };
  }

  const reason = command.reason.trim();
  const requestId = command.requestId.trim();
  const inputIssues = [
    command.actorUserId.trim() ? null : "actor_required",
    requestId ? null : "request_id_required",
    reason ? null : "reason_required",
  ].filter((issue): issue is string => issue !== null);
  if (inputIssues.length > 0) return { issues: inputIssues, ok: false };

  const state = await store.loadState(command.revisionId);
  if (!state) return { issues: ["revision_not_found"], ok: false };
  const snapshotIssues = validateSnapshot(state);
  if (snapshotIssues) return { issues: snapshotIssues, ok: false };

  const planned = planPublication({
    approvedRevisionIds: new Set([state.requested.id]),
    current: state.current,
    requested: state.requested,
  });
  if ("issues" in planned) return { issues: planned.issues, ok: false };
  if (planned.eventType !== "published") {
    return { issues: ["operation_pointer_direction_mismatch"], ok: false };
  }

  await store.commit({
    actorUserId: command.actorUserId,
    approval: { reason, requestId: `${requestId}:review` },
    plan: planned,
    reason,
    requestId: `${requestId}:publish`,
    requested: state.requested,
  });
  return { ok: true, plan: planned };
}

function validateSnapshot(state: PublicationState): readonly string[] | null {
  if (state.requestedSchemaVersion !== 1) {
    return [
      `snapshot:schema_version:unsupported_${state.requestedSchemaVersion}`,
    ];
  }
  const snapshot = parsePublishedRevisionSnapshot(state.requestedSnapshot);
  return snapshot.ok
    ? null
    : snapshot.issues.map(({ code, path }) => `snapshot:${path}:${code}`);
}

function operationEventType(
  operation: PublicationOperation,
): PublicationPlan["eventType"] {
  return operation === "publish" ? "published" : "rolled_back";
}
