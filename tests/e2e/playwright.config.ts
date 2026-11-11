import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["junit", { outputFile: "../../artifacts/e2e/results.xml" }],
    ["html", { outputFolder: "../../artifacts/e2e/report", open: "never" }],
  ],
  outputDir: "../../artifacts/e2e/test-results",
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://127.0.0.1:18107",
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
