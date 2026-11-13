// Visual review captures against the running stack. Not part of the verification gate:
//   docker compose -p manicule -f infra/docker/compose.yaml run --rm --no-deps e2e \
//     node tests/e2e/review.mjs
// Images land in artifacts/ui-review. The headless browser only has a CPU rasteriser,
// which the app declines for the WebGL lens; "?lens=software" opts in for the hero shots.
// REVIEW_SCENES picks from preloader,hero,entrance,sections,full; REVIEW_VIEWPORTS from
// panel,desktop,phone. REVIEW_BROWSER=firefox|webkit repeats the pass in another engine.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "@playwright/test";

const base = process.env.WEB_BASE_URL ?? "http://127.0.0.1:18107";
const out = fileURLToPath(new URL("../../artifacts/ui-review/", import.meta.url));
const only = (process.env.REVIEW_VIEWPORTS ?? "panel,desktop,phone").split(",");
const scenes = (
  process.env.REVIEW_SCENES ?? "preloader,hero,entrance,sections,full"
).split(",");
const engineName = process.env.REVIEW_BROWSER ?? "chromium";
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error(`Unknown REVIEW_BROWSER: ${engineName}`);
const prefix = engineName === "chromium" ? "" : `${engineName}-`;

const viewports = {
  panel: { width: 547, height: 615, deviceScaleFactor: 1.5 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  phone: { width: 360, height: 780, deviceScaleFactor: 2 },
};

const sections = [
  [".idea-title", "idea"],
  [".statement", "statement"],
  [".marquee", "marquee"],
  [".stack-card:nth-child(2)", "loop"],
  [".console", "console"],
  [".roadmap-list", "roadmap"],
  [".site-footer", "footer"],
];

// Milliseconds into the bead's entrance: its first frame, the swell, the overshoot, rest.
const entranceStops = [0, 60, 160, 360, 900, 1500];

/**
 * Runs the page's animation frames on a stepped clock: 60 per second by its own count,
 * however long each really takes. From the bead's first draw the clock stops at each
 * entrance stop in turn, so a slow rasteriser still shows the entrance frame by frame.
 */
function steppedClock(stops) {
  const clock = { now: 0, frames: 0, beadAt: -1, stop: 0, radius: -1 };
  window.__clock = clock;
  const real = window.requestAnimationFrame.bind(window);
  let queue = new Map();
  let next = 1;
  window.requestAnimationFrame = (callback) => {
    queue.set(next, callback);
    return next++;
  };
  window.cancelAnimationFrame = (id) => queue.delete(id);
  const tick = () => {
    const limit = clock.beadAt < 0 ? Infinity : clock.beadAt + (stops[clock.stop] ?? 0);
    clock.now = Math.min(limit, clock.now + 1000 / 60);
    clock.frames += 1;
    const callbacks = [...queue.values()];
    queue = new Map();
    for (const callback of callbacks) callback(clock.now);
    real(tick);
  };
  real(tick);
  for (const { prototype } of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const draw = prototype.drawArrays;
    prototype.drawArrays = function (...args) {
      const revealed = document.documentElement.classList.contains("is-loaded");
      if (clock.beadAt < 0 && revealed) clock.beadAt = clock.now;
      draw.apply(this, args);
      if (clock.radius >= 0) return;
      // The bead's footprint as the radius of a circle with the same area, in CSS pixels.
      // It has to be read here: the drawing buffer is cleared once the frame is shown.
      const { width, height, clientWidth } = this.canvas;
      const pixels = new Uint8Array(width * height * 4);
      this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
      let solid = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 127) solid += 1;
      }
      clock.radius = Math.round(Math.sqrt(solid / Math.PI) / (width / clientWidth));
    };
  }
}

function measure() {
  const widthOf = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().width;
  };
  const title = document.querySelector(".hero-title");
  const titleSize = Number.parseFloat(getComputedStyle(title).fontSize);
  const wordmark = document.querySelector(".footer-wordmark");
  const wordmarkSize = Number.parseFloat(getComputedStyle(wordmark).fontSize);
  const words = [...document.querySelectorAll("[data-lens-text]")];
  const context = document.createElement("canvas").getContext("2d");
  return {
    lens: document.querySelector(".hero").getAttribute("data-lens"),
    frameMs: document.querySelector(".hero-lens").getAttribute("data-frame-ms"),
    headline: titleSize,
    // Em widths behind the layout constants --k1 (hero) and --k3 (footer).
    wordsEm: words.map((word) => +(widthOf(word) / titleSize).toFixed(3)),
    wordmarkEm: +(widthOf(document.querySelector(".kinetic")) / wordmarkSize).toFixed(3),
    // Canvas text metrics minus DOM metrics per word, in px: the lens mask must match.
    maskDelta: words.map((word) => {
      const style = getComputedStyle(word);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fontStretch =
        Number.parseFloat(style.fontStretch) < 94 ? "semi-condensed" : "normal";
      context.letterSpacing = style.letterSpacing;
      return +(context.measureText(word.textContent).width - widthOf(word)).toFixed(2);
    }),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    fonts: [...document.fonts]
      .filter((font) => font.status === "loaded")
      .map((font) => font.family),
  };
}

await mkdir(out, { recursive: true });
const browser = await engine.launch();

for (const name of only) {
  const viewport = viewports[name];
  if (!viewport) continue;
  const { deviceScaleFactor, ...size } = viewport;
  const problems = [];
  const open = async () => {
    const context = await browser.newContext({ viewport: size, deviceScaleFactor });
    const page = await context.newPage();
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    const shot = (label, options = {}) =>
      page.screenshot({ path: `${out}/${prefix}${name}-${label}.png`, ...options });
    return { context, page, shot };
  };
  const loaded = (page) =>
    page.waitForFunction(() => document.documentElement.classList.contains("is-loaded"));

  if (scenes.includes("preloader")) {
    // With the script held back the static preloader keeps counting and never lifts.
    const { context, page, shot } = await open();
    await page.route("**/assets/*.js", () => {});
    await page.goto(base, { waitUntil: "commit" });
    await page.locator(".preloader-number").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    await shot("preloader");
    await context.close();
  }

  if (scenes.includes("hero")) {
    const { context, page, shot } = await open();
    await page.goto(`${base}/?lens=software`);
    await loaded(page);
    await page.waitForTimeout(520);
    await shot("curtain");
    await page.waitForTimeout(4200);
    console.log(name, JSON.stringify(await page.evaluate(measure)));
    await shot("hero");
    await page.getByRole("button", { name: "Pause motion" }).click();
    await page.waitForTimeout(600);
    await shot("hero-still");
    // A reload in the same tab skips the counter and only wipes.
    await page.reload({ waitUntil: "commit" });
    await page.locator(".preloader.is-returning").waitFor();
    await shot("returning");
    await loaded(page);
    await context.close();
  }

  if (scenes.includes("entrance")) {
    const { context, page, shot } = await open();
    await page.addInitScript(steppedClock, entranceStops);
    await page.goto(`${base}/?lens=software`);
    await loaded(page);
    await page.waitForFunction(
      () => document.querySelector(".hero").dataset.lens !== "pending",
    );
    const lens = await page.locator(".hero").getAttribute("data-lens");
    const radii = [];
    // Without a lens there is no entrance to step through, only the CSS bead.
    for (const [index, stop] of lens === "on" ? entranceStops.entries() : []) {
      await page.evaluate((at) => {
        window.__clock.stop = at;
      }, index);
      // The clock has to arrive, and the frame drawn there has to reach the screen.
      const reached = await page.waitForFunction(
        (at) => {
          const clock = window.__clock;
          return clock.beadAt >= 0 && clock.now >= clock.beadAt + at ? clock.frames : 0;
        },
        stop,
        { timeout: 240_000 },
      );
      const frame = await reached.jsonValue();
      await page.evaluate(() => {
        window.__clock.radius = -1;
      });
      await page.waitForFunction(
        (after) => window.__clock.frames >= after && window.__clock.radius >= 0,
        frame + 3,
        { timeout: 60_000 },
      );
      radii.push(await page.evaluate(() => window.__clock.radius));
      await shot(`entrance-${String(stop).padStart(4, "0")}`);
    }
    console.log(
      lens === "on"
        ? `${name} entrance radius in px at ${entranceStops.join("/")} ms: ${radii.join("/")}`
        : `${name} entrance skipped: the lens is ${lens}`,
    );
    await context.close();
  }

  if (scenes.includes("sections") || scenes.includes("full")) {
    const { context, page, shot } = await open();
    await page.goto(base);
    await loaded(page);
    await page.getByText("OPERATIONAL").waitFor();
    await page.waitForTimeout(2400);
    if (scenes.includes("sections")) {
      await shot("hero-fallback");
      for (const [selector, label] of sections) {
        await page.locator(selector).first().scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, size.height * 0.3);
        await page.waitForTimeout(1500);
        await shot(label);
      }
      const row = page.locator(".roadmap-item summary").nth(1);
      await row.scrollIntoViewIfNeeded();
      await row.hover();
      await page.waitForTimeout(800);
      await shot("roadmap-hover");
      await page.getByRole("button", { name: "Fill a synthetic example" }).click();
      await page.getByRole("button", { name: "Give it a check" }).click();
      await page.getByRole("status").waitFor();
      await page.waitForTimeout(900);
      await shot("checked");
      // Scrolling back up brings the navigation dock into view.
      await page.mouse.wheel(0, -220);
      await page.waitForTimeout(1300);
      await shot("dock");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(900);
    }
    if (scenes.includes("full")) {
      await page.getByRole("button", { name: "Pause motion" }).click();
      await page.waitForTimeout(400);
      await shot("full", { fullPage: true });
    }
    await context.close();
  }

  console.log(name, "problems:", problems.length ? problems.join(" | ") : "none");
}

await browser.close();
