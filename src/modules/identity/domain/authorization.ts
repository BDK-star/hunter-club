export const roles = [
  "member",
  "contributor",
  "editor",
  "moderator",
  "admin",
] as const;

export type Role = (typeof roles)[number];

export const capabilities = [
  "content.submit",
  "catalog.draft",
  "content.review",
  "content.publish",
  "content.rollback",
  "moderation.case.manage",
  "identity.role.assign",
] as const;

export type Capability = (typeof capabilities)[number];
export type AssuranceLevel = "aal1" | "aal2";
export type UserStatus = "active" | "suspended" | "deleted";

export type AuthorizationPrincipal = Readonly<{
  assuranceLevel: AssuranceLevel;
  roles: ReadonlySet<Role>;
  status: UserStatus;
}>;

export type AuthorizationDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      reason:
        | "account_unavailable"
        | "capability_missing"
        | "second_factor_required";
    }>;

const capabilitiesByRole: Readonly<Record<Role, ReadonlySet<Capability>>> = {
  member: new Set(["content.submit"]),
  contributor: new Set(["content.submit", "catalog.draft"]),
  editor: new Set([
    "content.submit",
    "catalog.draft",
    "content.review",
    "content.publish",
    "content.rollback",
  ]),
  moderator: new Set(["content.submit", "moderation.case.manage"]),
  admin: new Set(capabilities),
};

const privilegedRoles = new Set<Role>(["editor", "moderator", "admin"]);

export function authorize(
  principal: AuthorizationPrincipal,
  capability: Capability,
): AuthorizationDecision {
  if (principal.status !== "active") {
    return { allowed: false, reason: "account_unavailable" };
  }

  const grantsCapability = [...principal.roles].some((role) =>
    capabilitiesByRole[role].has(capability),
  );
  if (!grantsCapability) {
    return { allowed: false, reason: "capability_missing" };
  }

  const usesPrivilegedRole = [...principal.roles].some(
    (role) =>
      privilegedRoles.has(role) && capabilitiesByRole[role].has(capability),
  );
  if (usesPrivilegedRole && principal.assuranceLevel !== "aal2") {
    return { allowed: false, reason: "second_factor_required" };
  }

  return { allowed: true };
}
