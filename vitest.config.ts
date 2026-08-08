import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    include: ["src/**/*.test.ts"],
  },
});
