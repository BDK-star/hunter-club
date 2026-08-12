import {
  authorize,
  type AuthorizationPrincipal,
} from "@/modules/identity/public";

import {
  compareRevisionSnapshots,
  type RevisionDifference,
} from "../domain/revision-diff";
import type { ReviewDecision, RevisionTargetKind } from "../domain/publication";

export type EditorialCandidate = Readonly<{
  changeSummary: string;
  createdAt: Date;
  currentRevisionId: string | null;
  currentSnapshot: unknown;
  draftSnapshot: unknown;
  latestReviewDecision: ReviewDecision | null;
  revisionId: string;
  sequence: number;
  slug: string;
  targetId: string;
  targetKind: RevisionTargetKind;
}>;

export type EditorialQueueItem = Omit<
  EditorialCandidate,
  "currentSnapshot" | "draftSnapshot"
> &
  Readonly<{ differences: readonly RevisionDifference[] }>;

export interface EditorialQueueStore {
  loadCandidates(): Promise<readonly EditorialCandidate[]>;
}

export type EditorialQueueResult =
  | Readonly<{ items: readonly EditorialQueueItem[]; ok: true }>
  | Readonly<{ issue: string; ok: false }>;

export async function loadEditorialQueue(
  store: EditorialQueueStore,
  principal: AuthorizationPrincipal,
): Promise<EditorialQueueResult> {
  const decision = authorize(principal, "content.review");
  if (!decision.allowed) return { issue: decision.reason, ok: false };

  const candidates = await store.loadCandidates();
  return {
    items: candidates.map(
      ({ currentSnapshot, draftSnapshot, ...candidate }) => ({
        ...candidate,
        differences: compareRevisionSnapshots(currentSnapshot, draftSnapshot),
      }),
    ),
    ok: true,
  };
}
