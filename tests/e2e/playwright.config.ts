import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  // Software rendering on the one CPU this container is allowed is slow, and the engine is
  // shared with other projects; the bound is generous so only real hangs trip it.
  timeout: 60_000,
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
    // A failed test keeps its action log, console output and a screenshot. DOM snapshots,
    // the screencast and copied sources are left out: they are many small files, and each
    // write costs roughly 150 ms on the Windows bind mount this output lands on.
    trace: {
      mode: "retain-on-failure",
      screenshots: false,
      snapshots: false,
      sources: false,
    },
    screenshot: "only-on-failure",
  },
});
