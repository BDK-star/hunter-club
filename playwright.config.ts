import { defineConfig, devices } from "@playwright/test";

const port = 3101;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
      scale: "css",
      threshold: 0.25,
    },
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: "test-results",
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  retries: process.env.CI ? 1 : 0,
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    colorScheme: "dark",
    headless: true,
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${baseURL}/health/live`,
  },
  ...(process.env.CI ? { workers: 2 } : {}),
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        viewport: { height: 1024, width: 768 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        deviceScaleFactor: 1,
        viewport: { height: 844, width: 390 },
      },
    },
    {
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
  ],
});
