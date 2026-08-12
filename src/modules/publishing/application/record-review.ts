import {
  authorize,
  type AuthorizationPrincipal,
} from "@/modules/identity/public";

import { reviewDecisions, type ReviewDecision } from "../domain/publication";

export type ReviewCommand = Readonly<{
  actorUserId: string;
  decision: ReviewDecision;
  principal: AuthorizationPrincipal;
  reason: string;
  requestId: string;
  revisionId: string;
}>;

export interface ReviewStore {
  append(command: Omit<ReviewCommand, "principal">): Promise<boolean>;
}

export async function recordReview(
  store: ReviewStore,
  command: ReviewCommand,
): Promise<Readonly<{ ok: true }> | Readonly<{ issue: string; ok: false }>> {
  const authorization = authorize(command.principal, "content.review");
  if (!authorization.allowed) {
    return { issue: authorization.reason, ok: false };
  }

  const normalized = {
    actorUserId: command.actorUserId.trim(),
    decision: command.decision,
    reason: command.reason.trim(),
    requestId: command.requestId.trim(),
    revisionId: command.revisionId.trim(),
  };
  if (!normalized.actorUserId) return { issue: "actor_required", ok: false };
  if (!normalized.revisionId) return { issue: "revision_required", ok: false };
  if (!normalized.requestId) return { issue: "request_id_required", ok: false };
  if (normalized.reason.length < 5 || normalized.reason.length > 1000) {
    return { issue: "reason_invalid", ok: false };
  }
  if (!reviewDecisions.includes(normalized.decision)) {
    return { issue: "decision_invalid", ok: false };
  }

  return (await store.append(normalized))
    ? { ok: true }
    : { issue: "revision_not_found", ok: false };
}
