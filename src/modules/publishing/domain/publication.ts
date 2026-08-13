export const revisionTargetKinds = ["article", "catalog_entity"] as const;
export type RevisionTargetKind = (typeof revisionTargetKinds)[number];

export const reviewDecisions = [
  "approved",
  "changes_requested",
  "rejected",
] as const;
export type ReviewDecision = (typeof reviewDecisions)[number];

export type RevisionDescriptor = Readonly<{
  id: string;
  sequence: number;
  targetId: string;
  targetKind: RevisionTargetKind;
}>;

export type PublicationPointer = Readonly<{
  revisionId: string;
  sequence: number;
  targetId: string;
  targetKind: RevisionTargetKind;
}>;

export type PublicationPlan = Readonly<{
  eventType: "published" | "rolled_back";
  fromRevisionId: string | null;
  toRevisionId: string;
}>;

export type PublicationIssue =
  | "revision_not_approved"
  | "revision_target_mismatch"
  | "same_revision";

export function planPublication(
  input: Readonly<{
    approvedRevisionIds: ReadonlySet<string>;
    current: PublicationPointer | null;
    requested: RevisionDescriptor;
  }>,
): PublicationPlan | Readonly<{ issues: readonly PublicationIssue[] }> {
  const issues: PublicationIssue[] = [];
  const { approvedRevisionIds, current, requested } = input;

  if (!approvedRevisionIds.has(requested.id)) {
    issues.push("revision_not_approved");
  }
  if (
    current &&
    (current.targetId !== requested.targetId ||
      current.targetKind !== requested.targetKind)
  ) {
    issues.push("revision_target_mismatch");
  }
  if (current?.revisionId === requested.id) {
    issues.push("same_revision");
  }
  if (issues.length > 0) return { issues };

  return {
    eventType:
      current && requested.sequence < current.sequence
        ? "rolled_back"
        : "published",
    fromRevisionId: current?.revisionId ?? null,
    toRevisionId: requested.id,
  };
}
