import { describe, expect, it, vi } from "vitest";

import {
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
