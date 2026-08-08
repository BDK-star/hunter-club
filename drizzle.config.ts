import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_MIGRATION_URL ??
      "postgresql://hunter_club:hunter_club@localhost:5432/hunter_club",
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/platform/database/schema.ts",
  strict: true,
  verbose: true,
});
