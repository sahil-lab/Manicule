const MINIMUM_INTRO_MS = 1900;
const RETURNING_INTRO_MS = 250;
const MAXIMUM_INTRO_MS = 4500;
const EXIT_MS = 1300;
const VISIT_KEY = "manicule:intro-seen";

let announce: (task: Promise<unknown>) => void = () => undefined;
const stage = new Promise<unknown>((resolve) => {
  announce = resolve;
});

/**
 * The hero calls this once, with a promise that settles when its lens can draw. The
 * preloader stays up for it, within its usual limit, so the first frame is not a hitch.
 */
export function holdIntroFor(task: Promise<unknown>): void {
  announce(task);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/** True from the second load in a tab onwards. Storage may be unavailable; then never. */
function hasVisited(): boolean {
  try {
    const seen = window.sessionStorage.getItem(VISIT_KEY) !== null;
    window.sessionStorage.setItem(VISIT_KEY, "1");
    return seen;
  } catch {
    return false;
  }
}

/** Lifts the static preloader once the bundled fonts and the hero are ready to be seen. */
export function finishLoading(): void {
  const preloader = document.getElementById("preloader");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    document.documentElement.classList.add("is-loaded");
    if (preloader) window.setTimeout(() => preloader.remove(), reduced ? 0 : EXIT_MS);
  };
  if (!preloader || reduced) {
    reveal();
    return;
  }
  // The counter is for a first arrival; a reload in the same tab only gets the wipe.
  const returning = hasVisited();
  if (returning) preloader.classList.add("is-returning");
  const fonts = document.fonts.ready.then(() => undefined);
  void Promise.race([
    Promise.all([wait(returning ? RETURNING_INTRO_MS : MINIMUM_INTRO_MS), fonts, stage]),
    wait(MAXIMUM_INTRO_MS),
  ]).then(reveal);
}
