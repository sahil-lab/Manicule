import { inflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const api = process.env.API_BASE_URL ?? "http://127.0.0.1:18207";

/** Minimal decoder for the 8-bit, non-interlaced RGB(A) PNGs that screenshots produce. */
function decodePng(png: Buffer) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const channels = png[25] === 6 ? 4 : 3;
  const data: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString("latin1", offset + 4, offset + 8) === "IDAT") {
      data.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const at = y * stride + x;
      const left = x >= channels ? (pixels[at - channels] ?? 0) : 0;
      const up = y > 0 ? (pixels[at - stride] ?? 0) : 0;
      const corner = x >= channels && y > 0 ? (pixels[at - stride - channels] ?? 0) : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - corner;
        const byLeft = Math.abs(estimate - left);
        const byUp = Math.abs(estimate - up);
        const byCorner = Math.abs(estimate - corner);
        predicted =
          byLeft <= byUp && byLeft <= byCorner ? left : byUp <= byCorner ? up : corner;
      }
      pixels[at] = ((raw[y * (stride + 1) + 1 + x] ?? 0) + predicted) & 255;
    }
  }
  return { channels, pixels };
}

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

test("motion is controllable and honors a changed reduced-motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // The intro overlay lifts on its own once the bundled fonts are ready.
  await expect(page.locator("#preloader")).toHaveCount(0);
  const marqueeRuns = () =>
    page
      .locator(".marquee-track")
      .first()
      .evaluate((element) =>
        element.getAnimations().some((animation) => animation.playState === "running"),
      );
  expect(await marqueeRuns()).toBe(true);
  // Scroll-linked choreography: the hero recedes and headings reveal as they arrive.
  await page.mouse.wheel(0, 700);
  await expect
    .poll(() =>
      page
        .locator(".hero")
        .evaluate((element) => Number(element.style.getPropertyValue("--p"))),
    )
    .toBeGreaterThan(0.3);
  await page.locator(".idea-title").scrollIntoViewIfNeeded();
  await expect(page.locator(".idea-title")).toHaveAttribute("data-inview", "true");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.getByRole("button", { name: "Enable motion" })).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator(".hero")).not.toHaveAttribute("style", /--p/);
  await page.getByRole("button", { name: "Enable motion" }).click();
  expect(await marqueeRuns()).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByText("Reduced motion", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  // Without motion nothing waits on a scroll position to become readable.
  await expect(page.locator(".statement .word").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".roadmap-item").last()).toHaveCSS("opacity", "1");
});

test("the WebGL lens refracts the headline when the renderer is allowed", async ({
  page,
}) => {
  // Reduced motion skips the intro and draws one still frame, which keeps this quick on a
  // CPU rasteriser. "?lens=software" opts in to that renderer for this check only.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/?lens=software");
  const hero = page.locator(".hero");
  await expect(hero).toHaveAttribute("data-lens", "on");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const line = await page.locator(".hero-line").first().boundingBox();
  if (!line) throw new Error("The first headline line is missing.");
  // The first line is bone text on black, so saturated lime there can only be the lens.
  // Its lowest fifth is skipped: the lime second line's tallest letters reach into it.
  const image = decodePng(
    await page.screenshot({ clip: { ...line, height: line.height * 0.8 } }),
  );
  let lensPixels = 0;
  for (let index = 0; index < image.pixels.length; index += image.channels) {
    const red = image.pixels[index] ?? 0;
    const green = image.pixels[index + 1] ?? 0;
    const blue = image.pixels[index + 2] ?? 0;
    if (green > 170 && red > 120 && blue < 130 && green - blue > 90) lensPixels += 1;
  }
  expect(lensPixels).toBeGreaterThan(400);
  await page.screenshot({ path: "../../artifacts/e2e/hero-lens.png" });

  await page.goto("/");
  await expect(hero).not.toHaveAttribute("data-lens", "pending");
  const mode = await hero.getAttribute("data-lens");
  expect(["on", "off"]).toContain(mode);
  // Without a GPU the headline gets its CSS bead instead of an empty canvas.
  const fallback = await page
    .locator(".hero-line-accent .hero-line-inner")
    .evaluate((element) => getComputedStyle(element, "::after").content !== "none");
  expect(fallback).toBe(mode === "off");
  await expect(page.locator(".hero-lens")).toBeVisible({ visible: mode === "on" });
});

test("keyboard navigation and the responsive composition remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // The load event can precede React's first commit; a key press before it goes nowhere.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    const navFits = await page.locator(".site-nav > *").evaluateAll((items) =>
      items.every((item) => {
        const box = item.getBoundingClientRect();
        return box.left >= 0 && box.right <= document.documentElement.clientWidth;
      }),
    );
    expect(navFits, `Navigation fits at ${width}px`).toBe(true);
    const hero = await page.getByRole("heading", { level: 1 }).boundingBox();
    if (!hero) throw new Error(`The hero heading is missing at ${width}px.`);
    expect(hero.x).toBeGreaterThanOrEqual(0);
    expect(hero.x + hero.width).toBeLessThanOrEqual(width);
    // The headline never wraps, so measure the words themselves, not their line boxes.
    const textFits = await page.locator("h1 [data-lens-text]").evaluateAll((words) =>
      words.every((word) => {
        const range = document.createRange();
        range.selectNodeContents(word);
        const bounds = range.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.left >= 0 &&
          bounds.right <= document.documentElement.clientWidth
        );
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
    .locator(".check-panel")
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
