import postgres, { type Sql } from "postgres";

import { getServerEnvironment } from "@/platform/config/runtime";

const runtime = globalThis as typeof globalThis & {
  hunterClubSql?: Sql;
};

export function getRuntimeSql(): Sql {
  runtime.hunterClubSql ??= postgres(getServerEnvironment().databaseUrl, {
    connect_timeout: 3,
    idle_timeout: 20,
    max: 5,
    prepare: false,
  });
  return runtime.hunterClubSql;
}

export async function probeRuntimeDatabase(): Promise<void> {
  await getRuntimeSql()`select 1`;
}
