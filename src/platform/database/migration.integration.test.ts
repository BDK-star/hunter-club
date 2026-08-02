import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";

describe("database migrations", () => {
  it("applies the versioned baseline to an empty PostgreSQL database", async () => {
    const client = new PGlite();
    const database = drizzle(client);

    try {
      await migrate(database, {
        migrationsFolder: path.resolve("drizzle"),
      });
      const result = await client.query<{ count: number }>(
        "select count(*)::int as count from drizzle.__drizzle_migrations",
      );

      expect(result.rows).toEqual([{ count: 1 }]);
    } finally {
      await client.close();
    }
  });
});
