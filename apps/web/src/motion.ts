/**
 * Imperative motion layer: scroll-linked progress values, entrance reveals, the marquee
 * rate, the cursor follower and magnetic controls. It only runs while motion is enabled;
 * with it stopped, every CSS fallback resolves to the final, fully visible state.
 */

type Cleanup = () => void;

type Scrub = {
  element: HTMLElement;
  mode: string;
  value: number;
  target: number;
  written: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function observeReveals(root: HTMLElement): Cleanup {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.inview = "true";
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
  );
  const watch = () => {
    for (const element of root.querySelectorAll("[data-reveal]:not([data-inview])")) {
      observer.observe(element);
    }
  };
  // React mounts some reveal targets later (for example once the status arrives).
  const mutations = new MutationObserver(watch);
  mutations.observe(root, { childList: true, subtree: true });
  watch();
  return () => {
    observer.disconnect();
    mutations.disconnect();
  };
}

function targetFor(item: Scrub, viewport: number): number {
  const rect = item.element.getBoundingClientRect();
  switch (item.mode) {
    case "hero":
      return clamp(window.scrollY / Math.max(1, item.element.offsetHeight));
    case "words":
      return clamp((viewport * 0.86 - rect.top) / (rect.height + viewport * 0.36));
    case "cover": {
      const next = item.element.nextElementSibling;
      if (!next) return 0;
      const gap = next.getBoundingClientRect().top - rect.top;
      return clamp(1 - gap / Math.max(1, rect.height));
    }
    case "enter":
      return clamp((viewport - rect.top) / Math.max(1, Math.min(rect.height, viewport)));
    default:
      return clamp((viewport - rect.top) / (viewport + rect.height));
  }
}

function runScroll(root: HTMLElement): Cleanup {
  const items = Array.from(
    root.querySelectorAll<HTMLElement>("[data-scrub]"),
    (element): Scrub => ({
      element,
      mode: element.dataset.scrub ?? "view",
      value: -1,
      target: 0,
      written: -1,
    }),
  );
  const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-marquee]"));
  const primed = new WeakSet<Animation>();
  let frame = 0;
  let lastTime = 0;
  let lastY = window.scrollY;
  let velocity = 0;
  let direction = 1;
  let rate = 1;
  let writtenPage = -1;
  let writtenVelocity = 0;

  const tick = (time: number) => {
    frame = 0;
    const delta = lastTime ? Math.min(64, Math.max(1, time - lastTime)) : 16;
    lastTime = time;
    const y = window.scrollY;
    const instant = (y - lastY) / delta;
    lastY = y;
    velocity += (instant - velocity) * (1 - Math.exp(-delta / 90));
    if (Math.abs(instant) > 0.02) direction = instant > 0 ? 1 : -1;
    let moving = Math.abs(velocity) > 0.004;

    const viewport = window.innerHeight;
    for (const item of items) item.target = targetFor(item, viewport);
    const ease = 1 - Math.exp(-delta / 110);
    for (const item of items) {
      if (item.value < 0) item.value = item.target;
      item.value += (item.target - item.value) * ease;
      if (Math.abs(item.target - item.value) > 0.0006) moving = true;
      else item.value = item.target;
      const rounded = Math.round(item.value * 1000) / 1000;
      if (rounded !== item.written) {
        item.written = rounded;
        item.element.style.setProperty("--p", String(rounded));
      }
    }

    const range = document.documentElement.scrollHeight - viewport;
    const page = range > 0 ? Math.round(clamp(y / range) * 1000) / 1000 : 0;
    if (page !== writtenPage) {
      writtenPage = page;
      root.style.setProperty("--page-p", String(page));
    }
    const skew = Math.round(clamp(velocity / 3, -1, 1) * 100) / 100;
    if (skew !== writtenVelocity) {
      writtenVelocity = skew;
      root.style.setProperty("--vel", String(skew));
    }

    const targetRate = direction * (1 + Math.min(Math.abs(velocity) * 2.4, 6));
    rate += (targetRate - rate) * (1 - Math.exp(-delta / 160));
    if (Math.abs(targetRate - rate) > 0.01) moving = true;
    // The navigation steps aside while reading down and returns on the way up. Past the
    // hero it comes back as a compact dock, which is swapped in while it is out of view.
    const nav = direction > 0 && y > viewport * 0.5 ? "hidden" : "shown";
    if (root.dataset.nav !== nav) root.dataset.nav = nav;
    const docked = y > viewport * 0.9;
    if (docked ? root.dataset.dock !== "true" : root.dataset.dock === "true") {
      root.dataset.dock = String(docked);
    }
    for (const track of tracks) {
      const base = Number(track.dataset.marquee) || 1;
      for (const animation of track.getAnimations()) {
        // An infinite animation still ends when played backwards to zero, so start far in.
        if (!primed.has(animation)) {
          primed.add(animation);
          animation.currentTime = 3_600_000;
        }
        animation.playbackRate = base * rate;
      }
    }

    if (moving) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  const wake = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", wake);
  wake();

  return () => {
    window.removeEventListener("scroll", wake);
    window.removeEventListener("resize", wake);
    cancelAnimationFrame(frame);
    for (const item of items) item.element.style.removeProperty("--p");
    root.style.removeProperty("--page-p");
    root.style.removeProperty("--vel");
    delete root.dataset.nav;
    delete root.dataset.dock;
  };
}

function runPointer(root: HTMLElement): Cleanup {
  const cursor = root.querySelector<HTMLElement>(".cursor");
  if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return () => undefined;
  }
  const label = cursor.querySelector<HTMLElement>(".cursor-label");
  const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-kinetic] > span"));
  let frame = 0;
  let x = 0;
  let y = 0;
  let currentX = 0;
  let currentY = 0;
  let magnet: HTMLElement | null = null;
  let lettersActive = false;

  const tick = () => {
    frame = 0;
    currentX += (x - currentX) * 0.24;
    currentY += (y - currentY) * 0.24;
    cursor.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
    if (Math.abs(x - currentX) + Math.abs(y - currentY) > 0.3) {
      frame = requestAnimationFrame(tick);
    }
  };

  const release = () => {
    magnet?.style.removeProperty("--mx");
    magnet?.style.removeProperty("--my");
    magnet = null;
  };

  const relax = () => {
    if (!lettersActive) return;
    lettersActive = false;
    for (const letter of letters) letter.style.removeProperty("--k");
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    x = event.clientX;
    y = event.clientY;
    if (cursor.dataset.visible !== "true") {
      cursor.dataset.visible = "true";
      currentX = x;
      currentY = y;
    }
    if (!frame) frame = requestAnimationFrame(tick);

    const target = event.target instanceof Element ? event.target : null;
    const labelled = target?.closest<HTMLElement>("[data-cursor]") ?? null;
    const state = labelled
      ? "label"
      : target?.closest("a, button, summary")
        ? "hover"
        : "idle";
    if (cursor.dataset.state !== state) cursor.dataset.state = state;
    if (labelled && label) {
      const open = labelled.closest("details")?.open;
      label.textContent =
        (open ? labelled.dataset.cursorOpen : undefined) ?? labelled.dataset.cursor ?? "";
    }

    const nextMagnet = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
    if (nextMagnet !== magnet) release();
    if (nextMagnet) {
      magnet = nextMagnet;
      const box = nextMagnet.getBoundingClientRect();
      nextMagnet.style.setProperty(
        "--mx",
        `${((x - box.left - box.width / 2) * 0.28).toFixed(1)}px`,
      );
      nextMagnet.style.setProperty(
        "--my",
        `${((y - box.top - box.height / 2) * 0.34).toFixed(1)}px`,
      );
    }

    if (target?.closest("[data-kinetic]")) {
      lettersActive = true;
      for (const letter of letters) {
        const box = letter.getBoundingClientRect();
        const distance = Math.abs(x - box.left - box.width / 2);
        const pull = clamp(1 - distance / (box.width * 1.9));
        letter.style.setProperty("--k", (pull * pull).toFixed(3));
      }
    } else {
      relax();
    }
  };

  const onLeave = () => {
    cursor.dataset.visible = "false";
    release();
    relax();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    cancelAnimationFrame(frame);
    onLeave();
    cursor.style.removeProperty("transform");
    delete cursor.dataset.state;
  };
}

export function startMotion(root: HTMLElement): Cleanup {
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof MutationObserver === "undefined" ||
    typeof requestAnimationFrame !== "function"
  ) {
    return () => undefined;
  }
  const stops = [observeReveals(root), runScroll(root), runPointer(root)];
  return () => {
    for (const stop of stops) stop();
  };
}
