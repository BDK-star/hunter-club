import { describe, expect, it } from "vitest";

import {
  loadEditorialQueue,
  type EditorialQueueStore,
} from "./load-editorial-queue";

const store: EditorialQueueStore = {
  async loadCandidates() {
    return [
      {
        changeSummary: "补齐首条来源事实",
        createdAt: new Date("2026-08-12T00:00:00Z"),
        currentRevisionId: "current-1",
        currentSnapshot: { facts: [{ statement: "旧说明" }] },
        draftSnapshot: { facts: [{ statement: "新说明" }] },
        latestReviewDecision: null,
        revisionId: "draft-2",
        sequence: 2,
        slug: "nen",
        targetId: "target-1",
        targetKind: "catalog_entity",
      },
    ];
  },
};

describe("editorial queue", () => {
  it("requires an aal2 content reviewer and returns snapshot differences", async () => {
    await expect(
      loadEditorialQueue(store, {
        assuranceLevel: "aal1",
        roles: new Set(["editor"]),
        status: "active",
      }),
    ).resolves.toEqual({ issue: "second_factor_required", ok: false });

    await expect(
      loadEditorialQueue(store, {
        assuranceLevel: "aal2",
        roles: new Set(["editor"]),
        status: "active",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          differences: [
            {
              after: "新说明",
              before: "旧说明",
              kind: "changed",
              path: "facts[0].statement",
            },
          ],
          revisionId: "draft-2",
        },
      ],
      ok: true,
    });
  });
});
