import { describe, expect, it, vi } from "vitest";

import {
  executeApprovalPublication,
  executePublication,
  type PublicationState,
  type PublicationStore,
} from "./execute-publication";

const approvedState: PublicationState = {
  current: null,
  latestReviewDecision: "approved",
  requested: {
    id: "revision-1",
    sequence: 1,
    targetId: "article-1",
    targetKind: "article",
  },
  requestedSchemaVersion: 1,
  requestedSnapshot: {
    aliases: [],
    body: "已核对正文",
    canonStatus: "canon",
    locale: "zh-CN",
    sourceReferenceIds: ["source-reference-1"],
    spoilerLevel: "safe",
    title: "测试文章",
    type: "article",
  },
};

function createStore(state: PublicationState | null): PublicationStore {
  return {
    loadState: vi.fn().mockResolvedValue(state),
    commit: vi.fn().mockResolvedValue(undefined),
  };
}

function command() {
  return {
    actorUserId: "editor-1",
    operation: "publish" as const,
    principal: {
      assuranceLevel: "aal2" as const,
      roles: new Set(["editor" as const]),
      status: "active" as const,
    },
    reason: "来源与剧透范围已核对",
    requestId: "request-1",
    revisionId: approvedState.requested.id,
  };
}

describe("execute publication", () => {
  it("commits approval and publication as one command", async () => {
    const store = createStore({
      ...approvedState,
      latestReviewDecision: null,
    });

    await expect(
      executeApprovalPublication(store, {
        actorUserId: "editor-1",
        principal: command().principal,
        reason: "来源、正典与剧透边界已核对并批准发布",
        requestId: "approval-publication-1",
        revisionId: approvedState.requested.id,
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(store.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        approval: {
          reason: "来源、正典与剧透边界已核对并批准发布",
          requestId: "approval-publication-1:review",
        },
        requestId: "approval-publication-1:publish",
      }),
    );
  });

  it("commits an approved publication after authorization", async () => {
    const store = createStore(approvedState);

    await expect(executePublication(store, command())).resolves.toEqual({
      ok: true,
      plan: {
        eventType: "published",
        fromRevisionId: null,
        toRevisionId: "revision-1",
      },
    });
    expect(store.commit).toHaveBeenCalledOnce();
  });

  it("uses only the latest review decision", async () => {
    const store = createStore({
      ...approvedState,
      latestReviewDecision: "changes_requested",
    });

    await expect(executePublication(store, command())).resolves.toEqual({
      issues: ["revision_not_approved"],
      ok: false,
    });
    expect(store.commit).not.toHaveBeenCalled();
  });

  it("rejects an invalid public snapshot before moving a pointer", async () => {
    const store = createStore({
      ...approvedState,
      requestedSnapshot: { title: "不完整快照" },
    });

    await expect(executePublication(store, command())).resolves.toEqual({
      issues: ["snapshot:type:unknown_snapshot_type"],
      ok: false,
    });
    expect(store.commit).not.toHaveBeenCalled();
  });

  it("rejects authorization before loading any protected state", async () => {
    const store = createStore(approvedState);

    await expect(
      executePublication(store, {
        ...command(),
        principal: {
          assuranceLevel: "aal1",
          roles: new Set(["editor"]),
          status: "active",
        },
      }),
    ).resolves.toEqual({
      issues: ["authorization:second_factor_required"],
      ok: false,
    });
    expect(store.loadState).not.toHaveBeenCalled();
  });

  it("does not disguise a rollback as a forward publication", async () => {
    const store = createStore(approvedState);

    await expect(
      executePublication(store, {
        ...command(),
        operation: "rollback",
      }),
    ).resolves.toEqual({
      issues: ["operation_pointer_direction_mismatch"],
      ok: false,
    });
    expect(store.commit).not.toHaveBeenCalled();
  });
});
