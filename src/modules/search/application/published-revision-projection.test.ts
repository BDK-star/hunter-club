import { describe, expect, it } from "vitest";

import { projectPublishedRevision } from "./published-revision-projection";

describe("published revision search projection", () => {
  it("builds cumulative documents at each spoiler boundary", () => {
    const documents = projectPublishedRevision({
      publishedAt: new Date("2026-08-12T00:00:00Z"),
      revisionId: "revision-1",
      slug: "gon-freecss",
      snapshot: {
        facts: [
          {
            canonStatus: "canon",
            sourceReferenceIds: ["source-1"],
            spoilerLevel: "safe",
            statement: "小杰来自鲸鱼岛。",
          },
          {
            canonStatus: "canon",
            sourceReferenceIds: ["source-2"],
            spoilerLevel: "anime",
            statement: "动画范围事实。",
          },
        ],
        kind: "character",
        translations: [
          {
            aliases: ["ゴン"],
            locale: "zh-CN",
            summary: "少年猎人。",
            title: "小杰·富力士",
          },
        ],
        type: "catalog_entity",
      },
      targetId: "entity-1",
    });

    expect(documents.map(({ spoilerLevel }) => spoilerLevel)).toEqual([
      "safe",
      "anime",
    ]);
    expect(documents[0]?.body).not.toContain("动画范围事实");
    expect(documents[1]?.body).toContain("动画范围事实");
  });

  it("does not invent a lower spoiler projection when no lower facts exist", () => {
    const documents = projectPublishedRevision({
      publishedAt: new Date("2026-08-12T00:00:00Z"),
      revisionId: "revision-2",
      slug: "spoiler-only-entry",
      snapshot: {
        facts: [
          {
            canonStatus: "canon",
            sourceReferenceIds: ["source-1"],
            spoilerLevel: "anime",
            statement: "只在动画边界显示。",
          },
        ],
        kind: "character",
        translations: [
          {
            aliases: [],
            locale: "zh-CN",
            summary: "摘要的剧透等级没有被单独声明。",
            title: "测试资料",
          },
        ],
        type: "catalog_entity",
      },
      targetId: "entity-2",
    });

    expect(documents.map(({ spoilerLevel }) => spoilerLevel)).toEqual([
      "anime",
    ]);
  });
});
