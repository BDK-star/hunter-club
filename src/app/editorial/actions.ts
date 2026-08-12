"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { requireInternalCapability } from "@/platform/auth/internal-session";
import { executeRuntimeApprovalPublication } from "@/platform/publishing/runtime";

const revisionIdSchema = z.uuid();
const reasonSchema = z.string().trim().min(5).max(1000);
const commandTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

export async function approveAndPublishRevision(
  formData: FormData,
): Promise<void> {
  const revisionId = revisionIdSchema.safeParse(formData.get("revisionId"));
  const reason = reasonSchema.safeParse(formData.get("reason"));
  const commandToken = commandTokenSchema.safeParse(
    formData.get("commandToken"),
  );
  if (!revisionId.success || !reason.success || !commandToken.success)
    redirect("/editorial?error=invalid_publish");

  try {
    const principal = await requireInternalCapability("content.review");
    const result = await executeRuntimeApprovalPublication({
      principal,
      reason: reason.data,
      requestId: `approval:${commandToken.data}`,
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
