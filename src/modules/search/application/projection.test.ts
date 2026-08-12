import { describe, expect, it, vi } from "vitest";

import {
  buildSearchProjectionDocument,
  rebuildSearchProjection,
  type PublishedSearchSource,
} from "./projection";

const source: PublishedSearchSource = {
  aliases: ["  ゴン  ", "ゴン"],
  body: "  第287期 猎人考试  ",
  canonStatus: "canon",
  kind: "character",
  locale: "zh-CN",
  publishedAt: new Date("2026-08-12T00:00:00.000Z"),
  revisionId: "revision-1",
  slug: "gon-freecss",
  spoilerLevel: "safe",
  targetId: "entity-1",
  targetKind: "catalog_entity",
  title: " 小杰·富力士 ",
};

describe("search projection", () => {
  it("normalizes and deduplicates searchable fields", () => {
    expect(buildSearchProjectionDocument(source)).toMatchObject({
      normalizedAliases: ["ゴン"],
      normalizedTitle: "小杰·富力士",
      projectionVersion: 1,
      searchText: "小杰·富力士 ゴン 第287期 猎人考试",
    });
  });

  it("can be rebuilt entirely from published truth-source records", async () => {
    const replaceAll = vi.fn().mockResolvedValue(undefined);
    const count = await rebuildSearchProjection(
      {
        async *readAllPublished() {
          yield source;
        },
      },
      { replaceAll },
    );

    expect(count).toBe(1);
    expect(replaceAll).toHaveBeenCalledWith([
      buildSearchProjectionDocument(source),
    ]);
  });
});
