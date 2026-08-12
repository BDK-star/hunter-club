"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { requireInternalCapability } from "@/platform/auth/internal-session";
import {
  executeRuntimePublication,
  recordRuntimeReview,
} from "@/platform/publishing/runtime";

const revisionIdSchema = z.uuid();
const reasonSchema = z.string().trim().min(5).max(1000);

export async function approveRevision(formData: FormData): Promise<void> {
  const revisionId = revisionIdSchema.safeParse(formData.get("revisionId"));
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!revisionId.success || !reason.success)
    redirect("/editorial?error=invalid_review");

  try {
    const principal = await requireInternalCapability("content.review");
    const result = await recordRuntimeReview({
      decision: "approved",
      principal,
      reason: reason.data,
      requestId: `review:${randomUUID()}`,
      revisionId: revisionId.data,
    });
    if (!result.ok) redirect(`/editorial?error=${result.issue}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/editorial?error=${mapActionError(error)}`);
  }
  revalidatePath("/editorial");
  redirect("/editorial?reviewed=1");
}

export async function publishRevision(formData: FormData): Promise<void> {
  const revisionId = revisionIdSchema.safeParse(formData.get("revisionId"));
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!revisionId.success || !reason.success)
    redirect("/editorial?error=invalid_publish");

  try {
    const principal = await requireInternalCapability("content.publish");
    const result = await executeRuntimePublication({
      operation: "publish",
      principal,
      reason: reason.data,
      requestId: `publish:${randomUUID()}`,
      revisionId: revisionId.data,
    });
    if (!result.ok)
      redirect(
        `/editorial?error=${encodeURIComponent(result.issues.join(","))}`,
      );
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/editorial?error=${mapActionError(error)}`);
  }
  revalidatePath("/editorial");
  revalidatePath("/search");
  redirect("/editorial?published=1");
}

function mapActionError(error: unknown): string {
  if (!(error instanceof Error)) return "server_error";
  if (error.message === "authentication_required")
    return "authentication_required";
  if (error.message.startsWith("authorization:"))
    return error.message.slice(14);
  return "server_error";
}
