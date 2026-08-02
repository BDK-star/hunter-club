import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { parseServerEnvironment } from "../src/platform/config/server";

config({ path: ".env.local", quiet: true });
const environment = parseServerEnvironment(process.env);
const client = postgres(environment.databaseMigrationUrl, {
  max: 1,
  prepare: false,
});

try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  process.stdout.write("Database migrations applied.\n");
} finally {
  await client.end();
}
