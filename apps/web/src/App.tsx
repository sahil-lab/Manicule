import { useEffect, useState, type FormEvent } from "react";
import { ApiProblem, loadStatus, validateMetadata, type SystemStatus } from "./api";

type Readiness =
  | { state: "loading" }
  | { state: "ready"; status: SystemStatus }
  | { state: "error"; message: string };

type Submission =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "valid"; name: string; version: string }
  | { state: "error"; message: string; errors: Record<string, string> };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function App() {
  const [readiness, setReadiness] = useState<Readiness>({ state: "loading" });
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [refresh, setRefresh] = useState(0);

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

  return (
    <div className="workspace">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Manicule home">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          Manicule
        </a>
        <span className="local-badge">LOCAL WORKSPACE</span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">API DOCUMENTATION BENCHMARK</p>
          <h1 id="page-title">Better docs. Fewer invented calls.</h1>
          <p className="lede">
            A foundation for measuring how clearly API documentation guides an agent.
            Start here by checking your local stack and synthetic API metadata.
          </p>
          <p className="scope-note">
            Phase 1 skeleton only. No agents, execution, or benchmark scores.
          </p>
        </section>

        <div className="panels">
          <section className="panel" aria-labelledby="stack-title">
            <div className="panel-heading">
              <span className="step">01</span>
              <h2 id="stack-title">Local stack</h2>
            </div>
            <p className="muted">Live readiness from the API and PostgreSQL.</p>
            <div className="stack-status" aria-live="polite">
              {readiness.state === "loading" && <p>Checking local services...</p>}
              {readiness.state === "ready" && (
                <>
                  <p className="ready">
                    <span className="status-dot" aria-hidden="true" />
                    Local stack ready
                  </p>
                  <dl>
                    <div>
                      <dt>API</dt>
                      <dd>Spring Boot / Java 21</dd>
                    </div>
                    <div>
                      <dt>Database</dt>
                      <dd>PostgreSQL connected</dd>
                    </div>
                    <div>
                      <dt>Migration</dt>
                      <dd>Schema v{readiness.status.schemaVersion}</dd>
                    </div>
                  </dl>
                </>
              )}
              {readiness.state === "error" && (
                <p className="error-message" role="alert">
                  Stack unavailable: {readiness.message}
                </p>
              )}
            </div>
            <button
              className="secondary"
              type="button"
              disabled={readiness.state === "loading"}
              onClick={() => {
                setReadiness({ state: "loading" });
                setRefresh((value) => value + 1);
              }}
            >
              Refresh status
            </button>
          </section>

          <section className="panel" aria-labelledby="metadata-title">
            <div className="panel-heading">
              <span className="step">02</span>
              <h2 id="metadata-title">Check synthetic metadata</h2>
            </div>
            <p className="muted">
              Validation only. This does not ingest an API or save a record.
            </p>
            <form noValidate onSubmit={(event) => void submit(event)}>
              <label htmlFor="api-name">API name</label>
              <input
                id="api-name"
                name="name"
                value={name}
                placeholder="Example pet store"
                maxLength={80}
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              {errors.name && (
                <p id="name-error" className="field-error">
                  {errors.name}
                </p>
              )}
              <label htmlFor="api-version">Version</label>
              <input
                id="api-version"
                name="version"
                value={version}
                placeholder="1.0.0"
                maxLength={40}
                required
                aria-invalid={Boolean(errors.version)}
                aria-describedby={errors.version ? "version-error" : "version-help"}
                onChange={(event) => setVersion(event.target.value)}
              />
              <p id="version-help" className="hint">
                Use a short identifier, for example 1.0.0 or v2-preview.
              </p>
              {errors.version && (
                <p id="version-error" className="field-error">
                  {errors.version}
                </p>
              )}
              <button type="submit" disabled={submission.state === "pending"}>
                {submission.state === "pending" ? "Checking..." : "Check metadata"}
              </button>
            </form>
            {submission.state === "valid" && (
              <p className="success-message" role="status">
                Metadata valid for {submission.name} ({submission.version}). Nothing was
                saved.
              </p>
            )}
            {submission.state === "error" && (
              <p className="error-message" role="alert">
                {submission.message}
              </p>
            )}
          </section>
        </div>

        <section className="future" aria-labelledby="future-title">
          <h2 id="future-title">What comes later</h2>
          <p>
            OpenAPI ingestion / deterministic tasks / constrained agents / local execution
            / documentation gap reports
          </p>
          <span className="planned">PLANNED - NOT IMPLEMENTED</span>
        </section>
      </main>
      <footer>
        Independent prototype. Not affiliated with Manicule. Local synthetic data only.
      </footer>
    </div>
  );
}
