import {
  authorize,
  type AuthorizationDecision,
  type AuthorizationPrincipal,
} from "@/modules/identity/public";

export function authorizePublication(
  principal: AuthorizationPrincipal,
  operation: "publish" | "rollback",
): AuthorizationDecision {
  return authorize(
    principal,
    operation === "publish" ? "content.publish" : "content.rollback",
  );
}
