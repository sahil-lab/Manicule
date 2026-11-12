import { expect, test } from "@playwright/test";

const api = process.env.API_BASE_URL ?? "http://127.0.0.1:18207";

test("browser reaches the real stack and handles valid and invalid metadata", async ({
  page,
}) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://web:8080/")) {
      externalRequests.push(request.url());
    }
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await expect(page).toHaveTitle("Manicule — API clarity, measured");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Less guess. More yes.",
  );
  expect(
    await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(100);
  await expect(page.getByRole("link", { name: "Enter the workspace" })).toHaveAttribute(
    "href",
    "#workspace",
  );
  await expect(page.getByText("OPERATIONAL")).toBeVisible();
  await expect(page.getByText("V1")).toBeVisible();
  await expect(page.getByText(/future ideas, not live features/)).toBeVisible();
  await page.getByRole("button", { name: "Pause motion" }).click();
  await page.screenshot({ path: "../../artifacts/e2e/hero-desktop.png" });
  await page.getByRole("link", { name: "Enter the workspace" }).click();
  await expect(page).toHaveURL(/#workspace$/);
  await page.getByRole("button", { name: "Fill a synthetic example" }).click();
  await expect(page.getByLabel("API name")).toHaveValue("Synthetic pet store");
  await expect(page.getByLabel("Version", { exact: true })).toHaveValue("1.0.0");
  await page.getByRole("button", { name: "Give it a check" }).click();
  await expect(page.getByRole("status")).toContainText("Nothing was saved.");
  await page.screenshot({ path: "../../artifacts/e2e/dashboard.png", fullPage: true });
  await page.getByLabel("API name").fill(" ");
  await page.getByLabel("Version", { exact: true }).fill("bad version");
  await page.getByRole("button", { name: "Give it a check" }).click();
  await expect(page.getByRole("alert")).toContainText("Correct the listed fields.");
  await expect(page.getByLabel("API name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Give it a check" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("artwork motion is controllable and honors a changed reduced-motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Pause motion" })).toBeVisible();
  expect(
    await page
      .locator(".sculpture-float")
      .evaluate((element) =>
        element.getAnimations().some((animation) => animation.playState === "running"),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.getByRole("button", { name: "Enable motion" })).toBeVisible();
  expect(
    await page
      .locator(".sculpture-float")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await page.getByRole("button", { name: "Enable motion" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByText("Reduced motion", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const rotation = page.getByRole("slider", { name: "Rotate the clarity object" });
  await rotation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rotation).toHaveValue("1");
  await expect(rotation).toHaveAttribute("aria-valuetext", "1 degree");
  await expect(page.locator(".sculpture-turn")).not.toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
});

test("keyboard navigation and the responsive composition remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const firstRoadmap = page.locator(".roadmap-item").first();
  await firstRoadmap.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    firstRoadmap.getByText(/Ownership, permissions, and safe ingestion/),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    firstRoadmap.getByText(/Ownership, permissions, and safe ingestion/),
  ).not.toBeVisible();
  for (const width of [1440, 1024, 768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      `No horizontal overflow at ${width}px`,
    ).toBe(true);
    const hero = await page.getByRole("heading", { level: 1 }).boundingBox();
    if (!hero) throw new Error(`The hero heading is missing at ${width}px.`);
    expect(hero.x).toBeGreaterThanOrEqual(0);
    expect(hero.x + hero.width).toBeLessThanOrEqual(width);
    const textFits = await page.locator("h1 > span, h1 > em").evaluateAll((lines) =>
      lines.every((line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        const bounds = range.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      }),
    );
    expect(textFits, `No clipped headline text at ${width}px`).toBe(true);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../../artifacts/e2e/hero-mobile.png" });
  await page.getByRole("button", { name: "Fill a synthetic example" }).click();
  await page.getByRole("button", { name: "Give it a check" }).click();
  await expect(page.getByRole("status")).toContainText("Nothing was saved.");
  await page
    .locator(".form-panel")
    .screenshot({ path: "../../artifacts/e2e/workspace-mobile.png" });
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
