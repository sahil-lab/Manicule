import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiProblem, loadStatus, validateMetadata } from "./api";
import { Hero } from "./Hero";
import { Idea } from "./Idea";
import { startMotion } from "./motion";
import { Playground } from "./Playground";
import { Roadmap, SiteFooter } from "./Roadmap";
import type { Readiness, Submission } from "./types";
import { Grain, Icon, Manicule } from "./ui";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [readiness, setReadiness] = useState<Readiness>({ state: "loading" });
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION).matches,
  );
  const motion = !motionPaused && !reducedMotion;

  useEffect(() => {
    const preference = window.matchMedia(REDUCED_MOTION);
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!motion || !shell) return;
    return startMotion(shell);
  }, [motion]);

  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    loadStatus(controller.signal)
      .then((status) => {
        if (controller.signal.aborted) return;
        setReadiness({
          state: "ready",
          status,
          checkedAt: new Date(),
          elapsedMs: Math.round(performance.now() - started),
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setReadiness({ state: "error", message: errorMessage(error) });
        }
      });
    return () => controller.abort();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmission({ state: "pending" });
    try {
      const result = await validateMetadata({ name, version });
      setSubmission({ state: "valid", name: result.name, version: result.version });
    } catch (error: unknown) {
      setSubmission({
        state: "error",
        message: errorMessage(error),
        errors: error instanceof ApiProblem ? error.errors : {},
      });
    }
  }

  return (
    <div className="site-shell" ref={shellRef} data-motion={motion ? "on" : "off"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="progress" aria-hidden="true" />

      <header className="site-nav">
        <a className="brand" href="#home" aria-label="Manicule — back to top">
          <span className="brand-word">manicule</span>
          <Manicule className="brand-mark" />
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#idea" aria-label="The idea">
            <span className="nav-extra">The </span>idea<sup aria-hidden="true">01</sup>
          </a>
          <a href="#workspace" aria-label="Playground">
            Play<span className="nav-extra">ground</span>
            <sup aria-hidden="true">02</sup>
          </a>
          <a href="#roadmap" aria-label="What's next">
            <span className="nav-extra">What&apos;s </span>next
            <sup aria-hidden="true">03</sup>
          </a>
        </nav>
        {reducedMotion ? (
          <span className="motion-note label" title="Your system asks for reduced motion">
            <Icon name="pause" size={14} />
            <span>Reduced motion</span>
          </span>
        ) : (
          <button
            className="motion-toggle label"
            type="button"
            aria-label={motionPaused ? "Enable motion" : "Pause motion"}
            onClick={() => setMotionPaused((paused) => !paused)}
          >
            <Icon name={motionPaused ? "play" : "pause"} size={14} />
            <span>Motion {motionPaused ? "off" : "on"}</span>
          </button>
        )}
      </header>

      <main id="main" tabIndex={-1}>
        <Hero motion={motion} stack={readiness.state} />
        <div className="sheet">
          <Idea />
          <Playground
            readiness={readiness}
            submission={submission}
            name={name}
            version={version}
            onName={(value) => {
              setName(value);
              setSubmission({ state: "idle" });
            }}
            onVersion={(value) => {
              setVersion(value);
              setSubmission({ state: "idle" });
            }}
            onSample={() => {
              setName("Synthetic pet store");
              setVersion("1.0.0");
              setSubmission({ state: "idle" });
            }}
            onSubmit={(event) => void submit(event)}
            onRecheck={() => {
              setReadiness({ state: "loading" });
              setRefresh((value) => value + 1);
            }}
          />
          <Roadmap />
        </div>
      </main>
      <SiteFooter />

      <div className="cursor" aria-hidden="true">
        <span className="cursor-dot" />
        <span className="cursor-label" />
      </div>
      <Grain />
    </div>
  );
}
