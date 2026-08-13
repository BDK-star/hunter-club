import { describe, expect, it } from "vitest";

import {
  isVisibleAtSpoilerLevel,
  normalizeCatalogSearchTerm,
  validateCatalogPublicationDraft,
  validateSourcedRelationDraft,
  type CatalogPublicationDraft,
} from "./catalog";

function validDraft(): CatalogPublicationDraft {
  return {
    facts: [
      {
        canonStatus: "canon",
        sourceReferenceIds: ["reference-1"],
        spoilerLevel: "safe",
        statement: "小杰参加了猎人考试。",
        verifiedAt: new Date("2026-08-01T00:00:00Z"),
      },
    ],
    kind: "character",
    slug: "gon-freecss",
    translations: [{ locale: "zh-CN", name: "小杰·富力士" }],
  };
}

describe("catalog publication contract", () => {
  it("accepts a localized, sourced and verified draft", () => {
    expect(validateCatalogPublicationDraft(validDraft())).toEqual([]);
  });

  it("rejects unsourced or unverified facts and duplicate locales", () => {
    const draft = validDraft();
    expect(
      validateCatalogPublicationDraft({
        ...draft,
        facts: [
          {
            ...draft.facts[0]!,
            canonStatus: "unverified",
            sourceReferenceIds: [],
          },
        ],
        translations: [
          ...draft.translations,
          { locale: "zh-CN", name: "杰·富力士" },
        ],
      }).map(({ code }) => code),
    ).toEqual(["duplicate_locale", "fact_missing_source", "unverified_fact"]);
  });

  it("normalizes aliases consistently without destroying CJK text", () => {
    expect(normalizeCatalogSearchTerm("  ＧＯＮ　小杰  ")).toBe("gon 小杰");
  });

  it("applies spoiler visibility as an ordered boundary", () => {
    expect(isVisibleAtSpoilerLevel("safe", "safe")).toBe(true);
    expect(isVisibleAtSpoilerLevel("anime", "safe")).toBe(false);
    expect(isVisibleAtSpoilerLevel("anime", "manga")).toBe(true);
    expect(isVisibleAtSpoilerLevel("manga", "anime")).toBe(false);
  });

  it("requires entity relations to be distinct, sourced and verified", () => {
    expect(
      validateSourcedRelationDraft({
        canonStatus: "unverified",
        relationType: "friend_of",
        sourceEntityId: "entity-1",
        sourceReferenceIds: [],
        spoilerLevel: "anime",
        targetEntityId: "entity-1",
        verifiedAt: new Date("2026-08-01T00:00:00Z"),
      }).map(({ path }) => path),
    ).toEqual(["targetEntityId", "sourceReferenceIds", "canonStatus"]);
  });
});
