import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // The CSP allows fonts from this origin only, so assets are never inlined as data URIs.
  build: { assetsInlineLimit: 0 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    maxWorkers: 1,
  },
});
