import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnvironment } from "@/platform/config/runtime";

export function isSupabaseAuthConfigured(): boolean {
  return getServerEnvironment().supabaseAuth !== null;
}

export async function createSupabaseServerClient() {
  const configuration = getServerEnvironment().supabaseAuth;
  if (!configuration) throw new Error("Supabase Auth is not configured");

  const cookieStore = await cookies();
  return createServerClient(configuration.url, configuration.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, options, value }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Proxy refreshes them.
        }
      },
    },
  });
}
