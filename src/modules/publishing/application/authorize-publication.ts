import {
  authorize,
  type AuthorizationDecision,
  type AuthorizationPrincipal,
} from "@/modules/identity/public";

export function authorizePublication(
  principal: AuthorizationPrincipal,
  operation: "publish" | "review_and_publish" | "rollback",
): AuthorizationDecision {
  if (operation === "rollback") return authorize(principal, "content.rollback");
  const review = authorize(principal, "content.review");
  return review.allowed ? authorize(principal, "content.publish") : review;
}
