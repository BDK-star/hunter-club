import { describe, expect, it } from "vitest";

import { parsePublishedRevisionSnapshot } from "./revision-snapshot";

describe("published revision snapshots", () => {
  it("requires article sources", () => {
    expect(
      parsePublishedRevisionSnapshot({
        aliases: [],
        body: "公开正文",
        canonStatus: "canon",
        locale: "zh-CN",
        sourceReferenceIds: [],
        spoilerLevel: "safe",
        title: "猎人考试指南",
        type: "article",
      }),
    ).toMatchObject({
      issues: [{ code: "article_missing_source", path: "sourceReferenceIds" }],
      ok: false,
    });
  });

  it("accepts a sourced catalog snapshot", () => {
    expect(
      parsePublishedRevisionSnapshot({
        facts: [
          {
            canonStatus: "canon",
            sourceReferenceIds: ["source-reference-1"],
            spoilerLevel: "safe",
            statement: "小杰参加猎人考试。",
          },
        ],
        kind: "character",
        translations: [
          {
            aliases: ["ゴン"],
            locale: "zh-CN",
            summary: "来自鲸鱼岛的少年。",
            title: "小杰·富力士",
          },
        ],
        type: "catalog_entity",
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects duplicate locales and unsourced or unverified facts", () => {
    const result = parsePublishedRevisionSnapshot({
      facts: [
        {
          canonStatus: "unverified",
          sourceReferenceIds: [],
          spoilerLevel: "manga",
          statement: "传闻",
        },
      ],
      kind: "character",
      translations: [
        { aliases: [], locale: "zh-CN", summary: "", title: "小杰" },
        { aliases: [], locale: "zh-CN", summary: "", title: "杰" },
      ],
      type: "catalog_entity",
    });

    expect(result).toMatchObject({
      issues: expect.arrayContaining([
        { code: "duplicate_locale", path: "translations.1.locale" },
        { code: "fact_missing_source", path: "facts.0.sourceReferenceIds" },
        { code: "unverified_content", path: "facts.0.canonStatus" },
      ]),
      ok: false,
    });
  });
});
