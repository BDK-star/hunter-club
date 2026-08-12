import { describe, expect, it } from "vitest";

import { authorize, type AuthorizationPrincipal } from "./authorization";

function principal(
  overrides: Partial<AuthorizationPrincipal> = {},
): AuthorizationPrincipal {
  return {
    assuranceLevel: "aal1",
    roles: new Set(["member"]),
    status: "active",
    ...overrides,
  };
}

describe("identity authorization", () => {
  it("allows a member to submit content without elevated assurance", () => {
    expect(authorize(principal(), "content.submit")).toEqual({
      allowed: true,
    });
  });

  it("requires aal2 when an editor publishes content", () => {
    const editor = principal({ roles: new Set(["editor"]) });

    expect(authorize(editor, "content.publish")).toEqual({
      allowed: false,
      reason: "second_factor_required",
    });
    expect(
      authorize({ ...editor, assuranceLevel: "aal2" }, "content.publish"),
    ).toEqual({ allowed: true });
  });

  it("does not let a lower role gain a capability through aal2", () => {
    expect(
      authorize(principal({ assuranceLevel: "aal2" }), "content.publish"),
    ).toEqual({ allowed: false, reason: "capability_missing" });
  });

  it("rejects suspended and deleted accounts before checking grants", () => {
    for (const status of ["suspended", "deleted"] as const) {
      expect(
        authorize(
          principal({
            assuranceLevel: "aal2",
            roles: new Set(["admin"]),
            status,
          }),
          "identity.role.assign",
        ),
      ).toEqual({ allowed: false, reason: "account_unavailable" });
    }
  });
});
