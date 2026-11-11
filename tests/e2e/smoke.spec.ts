import { expect, test } from "@playwright/test";

const api = process.env.API_BASE_URL ?? "http://127.0.0.1:18207";

test("browser reaches the real stack and handles valid and invalid metadata", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Better docs. Fewer invented calls.",
  );
  await expect(page.getByText("Local stack ready")).toBeVisible();
  await expect(page.getByText("Schema v1")).toBeVisible();
  await page.getByLabel("API name").fill("Synthetic pet store");
  await page.getByLabel("Version", { exact: true }).fill("1.0.0");
  await page.getByRole("button", { name: "Check metadata" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Metadata valid for Synthetic pet store (1.0.0). Nothing was saved.",
  );
  await page.screenshot({ path: "../../artifacts/e2e/dashboard.png", fullPage: true });
  await page.getByLabel("API name").fill(" ");
  await page.getByLabel("Version", { exact: true }).fill("bad version");
  await page.getByRole("button", { name: "Check metadata" }).click();
  await expect(page.getByRole("alert")).toHaveText("Correct the listed fields.");
  await expect(page.getByLabel("API name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Check metadata" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("real API enforces the skeleton contract and explicit failure responses", async ({
  request,
}) => {
  const readiness = await request.get(`${api}/actuator/health/readiness`);
  expect(readiness.status()).toBe(200);
  expect(await readiness.json()).toEqual({ status: "UP" });
  const status = await request.get(`${api}/api/status`);
  expect(status.status()).toBe(200);
  expect(await status.json()).toEqual({
    service: "manicule",
    phase: 1,
    schemaVersion: 1,
  });
  expect(status.headers()["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);

  const valid = await request.post(`${api}/api/preflight`, {
    data: { name: " Synthetic ", version: "v1.0-preview+2" },
  });
  expect(valid.status()).toBe(200);
  expect(await valid.json()).toEqual({
    valid: true,
    persisted: false,
    name: "Synthetic",
    version: "v1.0-preview+2",
  });

  for (const data of [
    { name: "", version: "bad version" },
    { name: "x".repeat(81), version: "1" },
    { name: "Synthetic", version: "v".repeat(41) },
    { name: "Synthetic", version: "1", url: "https://example.invalid" },
    { name: 123, version: "1" },
  ]) {
    const invalid = await request.post(`${api}/api/preflight`, { data });
    expect(invalid.status()).toBe(400);
    expect(invalid.headers()["content-type"]).toContain("application/problem+json");
  }
  const malformed = await request.post(`${api}/api/preflight`, {
    data: "{",
    headers: { "Content-Type": "application/json" },
  });
  expect(malformed.status()).toBe(400);
  const wrongType = await request.post(`${api}/api/preflight`, {
    data: "{}",
    headers: { "Content-Type": "text/plain" },
  });
  expect(wrongType.status()).toBe(415);
  const oversized = await request.post(`${api}/api/preflight`, {
    data: "x".repeat(8193),
    headers: { "Content-Type": "application/json" },
  });
  expect(oversized.status()).toBe(413);
  expect(oversized.headers()["content-type"]).toContain("application/problem+json");
  expect((await oversized.json()).status).toBe(413);
  const future = await request.post(`${api}/apis`, { data: {} });
  expect(future.status()).toBe(404);
  const crossOrigin = await request.fetch(`${api}/api/preflight`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.invalid",
      "Access-Control-Request-Method": "POST",
    },
  });
  expect(crossOrigin.headers()["access-control-allow-origin"]).toBeUndefined();
});

test("chunked request bodies cannot bypass the direct API size limit", async () => {
  const { request } = await import("node:http");
  const internalApi = process.env.INTERNAL_API_BASE_URL ?? api;
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const outgoing = request(
      `${internalApi}/api/preflight`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
        },
        timeout: 10_000,
      },
      (incoming) => {
        incoming.resume();
        incoming.on("end", () => resolve(incoming.statusCode));
      },
    );
    outgoing.on("error", reject);
    outgoing.on("timeout", () =>
      outgoing.destroy(new Error("Chunked size test timed out")),
    );
    outgoing.write("x".repeat(4096));
    outgoing.end("x".repeat(4097));
  });
  expect(status).toBe(413);
});
