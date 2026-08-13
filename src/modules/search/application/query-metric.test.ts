import { describe, expect, it } from "vitest";

import { createAnonymousSearchMetric } from "./query-metric";

const key = "test-only-fingerprint-key-32-characters";

describe("anonymous search metrics", () => {
  it("stores a keyed fingerprint and bounded filter metadata, not the query", () => {
    const metric = createAnonymousSearchMetric(
      {
        canonStatuses: ["conflict", "canon"],
        kinds: ["character"],
        locale: "zh-CN",
        maxSpoilerLevel: "anime",
        term: "  小杰  ",
      },
      0,
      key,
    );

    expect(metric).toEqual({
      filters: {
        canonStatuses: ["canon", "conflict"],
        kinds: ["character"],
        locale: "zh-CN",
        maxSpoilerLevel: "anime",
      },
      queryFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      queryLength: 2,
      resultCount: 0,
      zeroResult: true,
    });
    expect(JSON.stringify(metric)).not.toContain("小杰");
  });

  it("requires an application secret so common queries cannot be rainbow-tabled", () => {
    expect(() =>
      createAnonymousSearchMetric(
        { maxSpoilerLevel: "safe", term: "小杰" },
        1,
        "short-key",
      ),
    ).toThrow(/32 characters/);
  });
});
