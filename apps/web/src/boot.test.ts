import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revealed = () => document.documentElement.classList.contains("is-loaded");

beforeEach(() => {
  vi.useFakeTimers();
  // The module keeps one promise for the hero's report, so each case needs its own copy.
  vi.resetModules();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  window.sessionStorage.clear();
  document.documentElement.classList.remove("is-loaded");
  document.body.innerHTML = '<div id="preloader"></div>';
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, "fonts");
  document.body.innerHTML = "";
});

describe("the intro overlay", () => {
  it("stays up until the hero reports that its lens can draw", async () => {
    const { finishLoading, holdIntroFor } = await import("./boot");
    finishLoading();
    await vi.advanceTimersByTimeAsync(3000);
    expect(revealed()).toBe(false);

    holdIntroFor(Promise.resolve());
    await vi.advanceTimersByTimeAsync(0);
    expect(revealed()).toBe(true);
  });

  it("lifts at its limit when the hero never reports", async () => {
    const { finishLoading } = await import("./boot");
    finishLoading();
    await vi.advanceTimersByTimeAsync(4499);
    expect(revealed()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(revealed()).toBe(true);
  });
});
