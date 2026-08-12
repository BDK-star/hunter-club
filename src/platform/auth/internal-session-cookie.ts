import "server-only";

import { cookies } from "next/headers";

export const internalSessionCookieName = "hc_session";

export async function setInternalSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(internalSessionCookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
  });
}

export async function deleteInternalSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(internalSessionCookieName);
}
