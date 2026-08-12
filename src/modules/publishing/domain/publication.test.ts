import { describe, expect, it } from "vitest";

import { planPublication, type RevisionDescriptor } from "./publication";

const revision: RevisionDescriptor = {
  id: "revision-2",
  sequence: 2,
  targetId: "article-1",
  targetKind: "article",
};

describe("publication planning", () => {
  it("publishes an approved first revision", () => {
    expect(
      planPublication({
        approvedRevisionIds: new Set([revision.id]),
        current: null,
        requested: revision,
      }),
    ).toEqual({
      eventType: "published",
      fromRevisionId: null,
      toRevisionId: revision.id,
    });
  });

  it("records pointer movement without mutating historical revisions", () => {
    expect(
      planPublication({
        approvedRevisionIds: new Set([revision.id]),
        current: {
          revisionId: "revision-3",
          sequence: 3,
          targetId: revision.targetId,
          targetKind: revision.targetKind,
        },
        requested: revision,
      }),
    ).toEqual({
      eventType: "rolled_back",
      fromRevisionId: "revision-3",
      toRevisionId: revision.id,
    });
  });

  it("rejects unapproved, mismatched and unchanged pointers", () => {
    expect(
      planPublication({
        approvedRevisionIds: new Set(),
        current: {
          revisionId: revision.id,
          sequence: revision.sequence,
          targetId: "another-article",
          targetKind: "article",
        },
        requested: revision,
      }),
    ).toEqual({
      issues: [
        "revision_not_approved",
        "revision_target_mismatch",
        "same_revision",
      ],
    });
  });
});
