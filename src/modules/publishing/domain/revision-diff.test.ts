import { describe, expect, it } from "vitest";

import { compareRevisionSnapshots } from "./revision-diff";

describe("revision snapshot differences", () => {
  it("shows only changed, added and removed fields", () => {
    const differences = compareRevisionSnapshots(
      {
        facts: [{ statement: "旧说明" }],
        title: "念能力",
        obsolete: true,
      },
      {
        facts: [{ statement: "新说明" }],
        title: "念能力",
        source: "漫画第60话",
      },
    );

    expect(differences).toEqual([
      {
        after: "新说明",
        before: "旧说明",
        kind: "changed",
        path: "facts[0].statement",
      },
      {
        after: null,
        before: "true",
        kind: "removed",
        path: "obsolete",
      },
      {
        after: "漫画第60话",
        before: null,
        kind: "added",
        path: "source",
      },
    ]);
  });
});
