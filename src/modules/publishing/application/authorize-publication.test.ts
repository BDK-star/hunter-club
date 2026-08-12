import { describe, expect, it } from "vitest";

import { authorizePublication } from "./authorize-publication";

describe("publication authorization", () => {
  it("requires an editor or administrator with aal2", () => {
    expect(
      authorizePublication(
        {
          assuranceLevel: "aal1",
          roles: new Set(["editor"]),
          status: "active",
        },
        "publish",
      ),
    ).toEqual({ allowed: false, reason: "second_factor_required" });

    expect(
      authorizePublication(
        {
          assuranceLevel: "aal2",
          roles: new Set(["editor"]),
          status: "active",
        },
        "rollback",
      ),
    ).toEqual({ allowed: true });
  });
});
