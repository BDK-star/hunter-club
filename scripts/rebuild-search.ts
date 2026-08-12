import { config } from "dotenv";
import postgres from "postgres";

import { rebuildPostgresSearchProjection } from "../src/modules/search/infrastructure/postgres-projection-rebuilder";
import { parseServerEnvironment } from "../src/platform/config/server";

config({ path: ".env.local", quiet: true });
const environment = parseServerEnvironment(process.env);
const client = postgres(environment.databaseMigrationUrl, {
  max: 1,
  prepare: false,
});

try {
  const result = await rebuildPostgresSearchProjection(client);
  process.stdout.write(
    `Search projection rebuilt: ${result.revisionCount} revisions, ${result.documentCount} documents.\n`,
  );
} finally {
  await client.end();
}
