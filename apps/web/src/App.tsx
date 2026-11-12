import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiProblem, loadStatus, validateMetadata, type SystemStatus } from "./api";
import { ClaritySculpture } from "./ClaritySculpture";

type Readiness =
  | { state: "loading" }
  | { state: "ready"; status: SystemStatus }
  | { state: "error"; message: string };

type Submission =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "valid"; name: string; version: string }
  | { state: "error"; message: string; errors: Record<string, string> };

const iconShapes = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: (
    <>
      <path d="m7 12 3 3 7-7" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  brackets: <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-9-4 10" />,
  spark: <path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.6-2L20 12M4 12l2.3 5a7 7 0 0 0 11.6-2" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  plus: <path d="M5 12h14M12 5v14" />,
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6m0 3v.1" />
    </>
  ),
} satisfies Record<string, ReactNode>;

function Icon({
  name,
  size = 20,
  className,
}: {
  name: keyof typeof iconShapes;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconShapes[name]}
    </svg>
  );
}

const roadmap = [
  {
    phase: "02",
    title: "A home for every spec.",
    label: "SPEC LIBRARY",
    description:
      "Versioned API specifications and documentation, together in one place. Ownership, permissions, and safe ingestion come before implementation.",
  },
  {
    phase: "03",
    title: "Put understanding to the test.",
    label: "GROUNDED SCENARIOS",
    description:
      "Tasks grounded in known-correct requests, so the difference between understanding and guessing can be measured. No agent runs are available today.",
  },
  {
    phase: "LATER",
    title: "Make every miss mean something.",
    label: "DOCUMENTATION INSIGHTS",
    description:
      "Turn future failures into specific documentation improvements worth testing again. There are no benchmark results or scores in this prototype.",
  },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function App() {
  const [readiness, setReadiness] = useState<Readiness>({ state: "loading" });
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadStatus(controller.signal)
      .then((status) => {
        if (!controller.signal.aborted) setReadiness({ state: "ready", status });
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

  const errors = submission.state === "error" ? submission.errors : {};
  const stackIsReady = readiness.state === "ready";
  const motion = !motionPaused && !reducedMotion;

  return (
    <div className="site-shell" data-motion={motion ? "on" : "off"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="site-brand" href="#home" aria-label="Manicule — back to top">
          <Icon name="spark" size={30} />
          <span>
            manicule<span className="brand-period">.</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#idea">
            The idea<span>01</span>
          </a>
          <a href="#workspace">
            Playground<span>02</span>
          </a>
          <a href="#roadmap">
            What&apos;s next<span>03</span>
          </a>
        </nav>
        <div className="header-actions">
          {reducedMotion ? (
            <span className="motion-preference">
              <Icon name="pause" size={14} />
              Reduced motion
            </span>
          ) : (
            <button
              className="motion-toggle"
              type="button"
              aria-label={motionPaused ? "Enable motion" : "Pause motion"}
              onClick={() => setMotionPaused((paused) => !paused)}
            >
              <Icon name={motionPaused ? "play" : "pause"} size={14} />
              <span>Motion {motionPaused ? "off" : "on"}</span>
            </button>
          )}
          <a className="nav-cta" href="#workspace">
            Let&apos;s explore <Icon name="arrow" size={17} />
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="hero" id="home" aria-labelledby="page-title">
          <div className="hero-topline">
            <p className="eyebrow">
              <span className="status-dot" /> AN EXPERIMENT IN API CLARITY
            </p>
            <span className="edition">INDEPENDENT BY DESIGN / LOCAL EDITION</span>
          </div>
          <div className="hero-composition">
            <div className="hero-copy">
              <h1 id="page-title" aria-label="Less guess. More yes.">
                <span>Less guess.</span>
                <em>More yes.</em>
              </h1>
              <div className="hero-description">
                <span className="description-mark" aria-hidden="true">
                  ↳
                </span>
                <p>
                  Your API deserves to be understood.
                  <br />
                  We&apos;re exploring the space between documentation, understanding, and
                  that <em>finally, it clicks</em> feeling.
                </p>
              </div>
              <div className="hero-actions">
                <a className="pill-link hero-cta" href="#workspace">
                  Enter the workspace{" "}
                  <span>
                    <Icon name="arrow" />
                  </span>
                </a>
                <a className="text-link" href="#idea">
                  Meet the idea <Icon name="arrow" size={16} />
                </a>
              </div>
              <div className="hero-footnote">
                <span className={`status-dot ${stackIsReady ? "" : "is-waiting"}`} />
                {readiness.state === "loading"
                  ? "CONNECTING TO YOUR LOCAL FOUNDATION"
                  : stackIsReady
                    ? "LOCAL FOUNDATION CONNECTED"
                    : "LOCAL CONNECTION NEEDS ATTENTION"}
              </div>
            </div>
            <ClaritySculpture motion={motion} />
          </div>
          <div className="hero-baseline">
            <span>LESS NOISE. MORE MEANING.</span>
            <a href="#idea" aria-label="Scroll to the idea">
              SCROLL TO FIND CLARITY <Icon name="arrow" size={16} />
            </a>
            <span>
              PHASE 01 <i /> SYNTHETIC DATA ONLY
            </span>
          </div>
        </section>

        <section className="idea-section" id="idea" aria-labelledby="idea-title">
          <div className="section-topline">
            <span className="section-index">[01 — THE IDEA]</span>
            <span>GOOD DOCS LEAVE LESS TO THE IMAGINATION.</span>
          </div>
          <div className="idea-intro">
            <h2 id="idea-title" className="section-reveal">
              Between the docs
              <br />
              and the <em>aha.</em>
              <Icon name="spark" />
            </h2>
            <div className="idea-aside">
              <span className="aside-index">THAT&apos;S WHERE WE COME IN ↗</span>
              <p>
                A good API is only half the conversation. When documentation leaves a gap,
                an agent fills it with a guess.
              </p>
              <p>
                We&apos;re building toward making that gap visible.
                <br />
                And the next move a little more obvious.
              </p>
            </div>
          </div>
          <div className="idea-principles" aria-label="The planned documentation loop">
            <article className="principle">
              <div className="principle-art document-art" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <span className="principle-number">01 / THE INPUT</span>
                <h3>Start with the source.</h3>
                <p>The words an agent actually reads.</p>
              </div>
            </article>
            <article className="principle">
              <div className="principle-art focus-art" aria-hidden="true">
                <span />
                <span />
                <span />
                <i />
              </div>
              <div>
                <span className="principle-number">02 / THE QUESTION</span>
                <h3>Find the missing link.</h3>
                <p>Where understanding becomes a guess.</p>
              </div>
            </article>
            <article className="principle">
              <div className="principle-art signal-art" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <span className="principle-number">03 / THE AMBITION</span>
                <h3>Make the next call clear.</h3>
                <p>Better documentation. Less ambiguity.</p>
              </div>
            </article>
          </div>
          <p className="concept-note">
            <span>THE VISION, NOT A LIVE WORKFLOW.</span> Today&apos;s working slice:
            local health checks and metadata validation.
          </p>
        </section>

        <section
          className="workspace-section"
          id="workspace"
          aria-labelledby="workspace-title"
        >
          <div className="section-topline">
            <span className="section-index">[02 — THE PLAYGROUND]</span>
            <span className="workspace-status">
              <span className={`status-dot ${stackIsReady ? "" : "is-waiting"}`} />{" "}
              {readiness.state === "loading"
                ? "CHECKING THE LOCAL CONNECTION"
                : stackIsReady
                  ? "CONNECTED TO YOUR LOCAL STACK"
                  : "LOCAL CONNECTION UNAVAILABLE"}
            </span>
          </div>
          <div className="workspace-intro">
            <div>
              <h2 id="workspace-title" className="section-reveal">
                Enough theory.
                <br />
                <em>Try a little clarity.</em>
              </h2>
              <p>
                A small first step, not smoke and mirrors.
                <br />
                Real services. Real validation. Nothing saved.
              </p>
            </div>
            <span className="workspace-arrow" aria-hidden="true">
              ↘
            </span>
          </div>
          <div className="workspace-surface">
            <article
              className="health-panel"
              id="readiness"
              aria-labelledby="health-title"
            >
              <div className="panel-topline">
                <span className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>LOCAL / FOUNDATION</span>
              </div>
              <div className="health-heading">
                <div>
                  <span className="panel-eyebrow">THE ENGINE ROOM</span>
                  <h3 id="health-title">
                    All here.
                    <br />
                    <em>All local.</em>
                  </h3>
                </div>
                <span
                  className={`health-indicator ${stackIsReady ? "is-ready" : ""}`}
                  aria-hidden="true"
                >
                  <Icon
                    name={
                      stackIsReady
                        ? "check"
                        : readiness.state === "error"
                          ? "warning"
                          : "brackets"
                    }
                    size={30}
                  />
                </span>
              </div>
              <span
                className={`panel-state ${readiness.state === "error" ? "is-error" : ""}`}
              >
                <span className={`status-dot ${stackIsReady ? "" : "is-waiting"}`} />
                {readiness.state === "loading"
                  ? "CHECKING SERVICES"
                  : stackIsReady
                    ? "OPERATIONAL"
                    : "CONNECTION UNAVAILABLE"}
              </span>
              <p className="health-description">
                Checked on load. Recheck whenever you like.
              </p>
              {readiness.state === "loading" && (
                <div className="health-loading" aria-live="polite">
                  Connecting to the API and database...
                </div>
              )}
              {readiness.state === "error" && (
                <p className="health-error" role="alert">
                  We couldn&apos;t reach the local services. {readiness.message}
                </p>
              )}
              {readiness.state === "ready" && (
                <div className="service-list" aria-live="polite">
                  <div className="service-row">
                    <Icon name="brackets" />
                    <span>
                      <strong>API service</strong>
                      <small>Spring Boot · Java 21</small>
                    </span>
                    <span className="service-state">
                      ONLINE <i />
                    </span>
                  </div>
                  <div className="service-row">
                    <Icon name="database" />
                    <span>
                      <strong>PostgreSQL</strong>
                      <small>Private local database</small>
                    </span>
                    <span className="service-state">
                      CONNECTED <i />
                    </span>
                  </div>
                  <div className="service-row">
                    <Icon name="layers" />
                    <span>
                      <strong>Schema migration</strong>
                      <small>Database structure</small>
                    </span>
                    <span className="service-state">
                      V{readiness.status.schemaVersion} <i />
                    </span>
                  </div>
                </div>
              )}
              <div className="health-footer">
                <span>
                  <Icon name="lock" size={14} /> No published database port
                </span>
                <button
                  className="refresh-button"
                  type="button"
                  aria-label="Refresh system health"
                  disabled={readiness.state === "loading"}
                  onClick={() => {
                    setReadiness({ state: "loading" });
                    setRefresh((value) => value + 1);
                  }}
                >
                  <Icon name="refresh" size={16} /> Recheck
                </button>
              </div>
            </article>

            <article className="form-panel" aria-labelledby="preflight-title">
              <div className="form-topline">
                <span className="panel-eyebrow">YOUR FIRST SMALL WIN</span>
                <span className="validation-tag">VALIDATION ONLY</span>
              </div>
              <h3 id="preflight-title">
                Hello, <em>possibility.</em>
              </h3>
              <p className="form-description">
                Give your API a name and a version.
                <br />
                We&apos;ll check the details. That&apos;s it. That&apos;s the feature.
              </p>
              <div className="sample-row">
                <span>Just looking around?</span>
                <button
                  className="sample-button"
                  type="button"
                  disabled={submission.state === "pending"}
                  onClick={() => {
                    setName("Synthetic pet store");
                    setVersion("1.0.0");
                    setSubmission({ state: "idle" });
                  }}
                >
                  Fill a synthetic example <Icon name="arrow" size={15} />
                </button>
              </div>
              <form
                noValidate
                onSubmit={(event) => void submit(event)}
                aria-busy={submission.state === "pending"}
              >
                <fieldset
                  className="field-grid"
                  disabled={submission.state === "pending"}
                >
                  <legend className="sr-only">Synthetic API metadata</legend>
                  <div className="form-field">
                    <label htmlFor="api-name">API name</label>
                    <input
                      id="api-name"
                      name="name"
                      value={name}
                      placeholder="e.g. Pet store"
                      maxLength={80}
                      required
                      autoComplete="off"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "name-error" : "name-help"}
                      onChange={(event) => {
                        setName(event.target.value);
                        setSubmission({ state: "idle" });
                      }}
                    />
                    {errors.name ? (
                      <small id="name-error" className="field-error">
                        {errors.name}
                      </small>
                    ) : (
                      <small id="name-help" className="field-hint">
                        Up to 80 characters
                      </small>
                    )}
                  </div>
                  <div className="form-field">
                    <label htmlFor="api-version">Version</label>
                    <input
                      id="api-version"
                      name="version"
                      value={version}
                      placeholder="e.g. 1.0.0"
                      maxLength={40}
                      required
                      autoComplete="off"
                      aria-invalid={Boolean(errors.version)}
                      aria-describedby={errors.version ? "version-error" : "version-help"}
                      onChange={(event) => {
                        setVersion(event.target.value);
                        setSubmission({ state: "idle" });
                      }}
                    />
                    {errors.version ? (
                      <small id="version-error" className="field-error">
                        {errors.version}
                      </small>
                    ) : (
                      <small id="version-help" className="field-hint">
                        For example, v2-preview
                      </small>
                    )}
                  </div>
                </fieldset>
                <button
                  className="submit-button"
                  type="submit"
                  disabled={submission.state === "pending"}
                >
                  {submission.state === "pending" ? (
                    <>
                      Checking your details... <span className="button-spinner" />
                    </>
                  ) : (
                    <>
                      Give it a check <Icon name="arrow" />
                    </>
                  )}
                </button>
              </form>
              {submission.state === "valid" && (
                <div className="feedback-message feedback-success" role="status">
                  <Icon name="check" />
                  <span>
                    <strong>Looking good.</strong> “{submission.name}” ·{" "}
                    {submission.version}. Nothing was saved.
                  </span>
                </div>
              )}
              {submission.state === "error" && (
                <div className="feedback-message feedback-error" role="alert">
                  <Icon name="warning" />
                  <span>
                    <strong>Let&apos;s try that again.</strong> {submission.message}
                  </span>
                </div>
              )}
              <div className="privacy-note">
                <Icon name="lock" size={14} /> SYNTHETIC METADATA ONLY <i /> NO SAVE. NO
                INGESTION.
              </div>
            </article>
          </div>
          <div className="workspace-baseline">
            <span>SMALL ON PURPOSE.</span>
            <p>One honest interaction is worth a thousand pretend metrics.</p>
            <Icon name="spark" size={26} />
          </div>
        </section>

        <section className="roadmap-section" id="roadmap" aria-labelledby="roadmap-title">
          <div className="section-topline">
            <span className="section-index">[03 — WHAT&apos;S NEXT]</span>
            <span>A DIRECTION. NOT A DONE LIST.</span>
          </div>
          <div className="roadmap-heading">
            <h2 id="roadmap-title" className="section-reveal">
              The bigger
              <br />
              <em>picture.</em>
            </h2>
            <p>
              Good things take a little building.
              <br />
              These are future ideas, not live features.
              <br />
              No benchmarks have been run.
            </p>
          </div>
          <div className="roadmap-list">
            {roadmap.map((item) => (
              <details className="roadmap-item" name="roadmap" key={item.phase}>
                <summary>
                  <span className="roadmap-phase">{item.phase}</span>
                  <span className="roadmap-title">
                    <small>{item.label}</small>
                    <span>{item.title}</span>
                  </span>
                  <span className="roadmap-status">
                    PLANNED{item.phase !== "LATER" && ` · PHASE ${item.phase}`}
                  </span>
                  <span className="disclosure-icon">
                    <Icon name="plus" />
                  </span>
                </summary>
                <div className="roadmap-detail">
                  <p>{item.description}</p>
                  <span>NOT IMPLEMENTED · SEPARATE PHASE APPROVAL REQUIRED</span>
                </div>
              </details>
            ))}
          </div>
          <div className="roadmap-bottom">
            <Icon name="spark" size={30} />
            <p>For now, a good place to start.</p>
            <a className="text-link" href="#workspace">
              Back to the playground <Icon name="arrow" size={17} />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-topline">
          <span>LET&apos;S MAKE THINGS MAKE SENSE.</span>
          <a href="#home" aria-label="Back to the beginning">
            <span>BACK TO TOP</span>
            <Icon name="arrow" size={24} />
          </a>
        </div>
        <a className="footer-wordmark" href="#home" aria-label="Manicule — back to top">
          manicule<span>↗</span>
        </a>
        <div className="footer-baseline">
          <span>AN INDEPENDENT LOCAL PROTOTYPE.</span>
          <span>SYNTHETIC DATA. REAL CURIOSITY.</span>
          <span>PHASE 01 / THE BEGINNING</span>
        </div>
      </footer>
    </div>
  );
}
