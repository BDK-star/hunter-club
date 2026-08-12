import { describe, expect, it } from "vitest";

import { catalogKindToSearchKind, validateSearchQuery } from "./search";

describe("search contract", () => {
  it("accepts bounded anonymous queries", () => {
    expect(
      validateSearchQuery({
        limit: 20,
        locale: "zh-CN",
        maxSpoilerLevel: "anime",
        term: "小杰",
      }),
    ).toEqual([]);
  });

  it("rejects empty, oversized and malformed query input", () => {
    expect(
      validateSearchQuery({
        limit: 51,
        locale: "not_a_locale",
        maxSpoilerLevel: "safe",
        term: " ".padEnd(102, "x"),
      }),
    ).toEqual(["term_too_long", "invalid_limit", "invalid_locale"]);
    expect(
      validateSearchQuery({ maxSpoilerLevel: "safe", term: "　" }),
    ).toEqual(["empty_term"]);
  });

  it("preserves catalog kinds across the search port", () => {
    expect(catalogKindToSearchKind("nen_ability")).toBe("nen_ability");
  });
});
