import { describe, expect, it, vi } from "vitest";

import { recordReview, type ReviewStore } from "./record-review";

const aal2Editor = {
  assuranceLevel: "aal2" as const,
  roles: new Set(["editor" as const]),
  status: "active" as const,
};

describe("record revision review", () => {
  it("authorizes and validates before appending an audit decision", async () => {
    const append = vi.fn<ReviewStore["append"]>().mockResolvedValue(true);
    const store: ReviewStore = { append };

    await expect(
      recordReview(store, {
        actorUserId: "editor-1",
        decision: "approved",
        principal: aal2Editor,
        reason: "来源、正典与剧透边界已核对",
        requestId: "review-request-1",
        revisionId: "revision-1",
      }),
    ).resolves.toEqual({ ok: true });
    expect(append).toHaveBeenCalledOnce();

    await expect(
      recordReview(store, {
        actorUserId: "editor-1",
        decision: "approved",
        principal: { ...aal2Editor, assuranceLevel: "aal1" },
        reason: "来源、正典与剧透边界已核对",
        requestId: "review-request-2",
        revisionId: "revision-1",
      }),
    ).resolves.toEqual({ issue: "second_factor_required", ok: false });
    expect(append).toHaveBeenCalledOnce();
  });
});
