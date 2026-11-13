import { Fragment, type FormEvent } from "react";
import type { Readiness, Submission } from "./types";
import { Icon, Lines } from "./ui";

type Props = {
  readiness: Readiness;
  submission: Submission;
  name: string;
  version: string;
  onName: (value: string) => void;
  onVersion: (value: string) => void;
  onSample: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRecheck: () => void;
};

const STACK_COPY: Record<Readiness["state"], string> = {
  loading: "Checking the local connection",
  ready: "Connected to your local stack",
  error: "Local connection unavailable",
};

const PANEL_COPY: Record<Readiness["state"], string> = {
  loading: "CHECKING SERVICES",
  ready: "OPERATIONAL",
  error: "CONNECTION UNAVAILABLE",
};

const clock = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function Playground({
  readiness,
  submission,
  name,
  version,
  onName,
  onVersion,
  onSample,
  onSubmit,
  onRecheck,
}: Props) {
  const errors = submission.state === "error" ? submission.errors : {};
  const pending = submission.state === "pending";
  const ready = readiness.state === "ready";

  return (
    <section className="playground" id="workspace" aria-labelledby="workspace-title">
      <div className="section-head label" data-reveal="up">
        <span>(02) — The playground</span>
        <span className="section-status">
          <i className={ready ? "dot" : "dot is-waiting"} /> {STACK_COPY[readiness.state]}
        </span>
      </div>
      <div className="playground-intro">
        <h2 id="workspace-title" className="display" data-reveal="lines">
          <Lines>
            {[
              "Enough theory.",
              <Fragment key="clarity">
                <em>Try a little clarity.</em>
              </Fragment>,
            ]}
          </Lines>
        </h2>
        <p data-reveal="up">
          A small first step, not smoke and mirrors. Real services. Real validation.
          Nothing saved.
        </p>
      </div>

      <div className="console" data-reveal="up">
        <article className="engine-panel" id="readiness" aria-labelledby="health-title">
          <div className="panel-top label">
            <span>The engine room</span>
            <span
              className={
                readiness.state === "error" ? "panel-state is-error" : "panel-state"
              }
            >
              <i className={ready ? "dot is-live" : "dot is-waiting"} />
              {PANEL_COPY[readiness.state]}
            </span>
          </div>
          <h3 id="health-title" className="panel-title">
            All here. <em>All local.</em>
          </h3>
          <p className="panel-meta label">
            {readiness.state === "ready"
              ? `Checked ${clock.format(readiness.checkedAt)} · ${readiness.elapsedMs} ms round trip`
              : "Checked on load. Recheck whenever you like."}
          </p>

          {readiness.state === "loading" && (
            <p className="health-loading" aria-live="polite">
              Connecting to the API and database...
            </p>
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
                <span className="service-name">
                  <strong>API service</strong>
                  <small>Spring Boot · Java 21</small>
                </span>
                <span className="service-state label">
                  ONLINE <i />
                </span>
              </div>
              <div className="service-row">
                <Icon name="database" />
                <span className="service-name">
                  <strong>PostgreSQL</strong>
                  <small>Private local database</small>
                </span>
                <span className="service-state label">
                  CONNECTED <i />
                </span>
              </div>
              <div className="service-row">
                <Icon name="layers" />
                <span className="service-name">
                  <strong>Schema migration</strong>
                  <small>Database structure</small>
                </span>
                <span className="service-state label">
                  V{readiness.status.schemaVersion} <i />
                </span>
              </div>
            </div>
          )}

          <div className="panel-foot">
            <span className="label">
              <Icon name="lock" size={14} /> No published database port
            </span>
            <button
              className="recheck"
              type="button"
              aria-label="Refresh system health"
              disabled={readiness.state === "loading"}
              onClick={onRecheck}
            >
              <Icon name="refresh" size={16} /> Recheck
            </button>
          </div>
        </article>

        <article className="check-panel" aria-labelledby="preflight-title">
          <div className="panel-top label">
            <span>Your first small win</span>
            <span className="panel-tag">Validation only</span>
          </div>
          <h3 id="preflight-title" className="panel-title">
            Hello, <em>possibility.</em>
          </h3>

          <form noValidate onSubmit={onSubmit} aria-busy={pending}>
            <fieldset className="madlib" disabled={pending}>
              <legend className="sr-only">Synthetic API metadata</legend>
              <span className="madlib-row">
                <span className="madlib-text">Check an API called</span>
                <span className="madlib-field">
                  <input
                    id="api-name"
                    name="name"
                    value={name}
                    placeholder="your API name"
                    maxLength={80}
                    required
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : "name-help"}
                    onChange={(event) => onName(event.target.value)}
                  />
                  <span className="madlib-caption label">
                    <label htmlFor="api-name">API name</label>
                    {errors.name ? (
                      <small id="name-error" className="field-error">
                        {errors.name}
                      </small>
                    ) : (
                      <small id="name-help">Up to 80 characters</small>
                    )}
                  </span>
                </span>
              </span>
              <span className="madlib-row">
                <span className="madlib-text">at version</span>
                <span className="madlib-field madlib-version">
                  <input
                    id="api-version"
                    name="version"
                    value={version}
                    placeholder="1.0.0"
                    maxLength={40}
                    required
                    autoComplete="off"
                    aria-invalid={Boolean(errors.version)}
                    aria-describedby={errors.version ? "version-error" : "version-help"}
                    onChange={(event) => onVersion(event.target.value)}
                  />
                  <span className="madlib-caption label">
                    <label htmlFor="api-version">Version</label>
                    {errors.version ? (
                      <small id="version-error" className="field-error">
                        {errors.version}
                      </small>
                    ) : (
                      <small id="version-help">For example, v2-preview</small>
                    )}
                  </span>
                </span>
              </span>
            </fieldset>

            <div className="check-actions">
              <button
                className="sample-button"
                type="button"
                disabled={pending}
                onClick={onSample}
              >
                Fill a synthetic example
              </button>
              <button
                className="pill pill-dark"
                type="submit"
                disabled={pending}
                data-magnetic
              >
                {pending ? "Checking your details..." : "Give it a check"}
                <span className="pill-icon">
                  {pending ? <span className="spinner" /> : <Icon name="arrow" />}
                </span>
              </button>
            </div>
          </form>

          {submission.state === "valid" && (
            <div className="ticket ticket-success" role="status">
              <Icon name="check" />
              <p>
                <strong>Looking good.</strong> “{submission.name}” · {submission.version}.
                Nothing was saved.
                <small className="label">
                  POST /api/preflight · valid · not persisted
                </small>
              </p>
            </div>
          )}
          {submission.state === "error" && (
            <div className="ticket ticket-error" role="alert">
              <Icon name="warning" />
              <p>
                <strong>Let&apos;s try that again.</strong> {submission.message}
              </p>
            </div>
          )}

          <p className="privacy-note label">
            <Icon name="lock" size={14} /> Synthetic metadata only · No save. No
            ingestion.
          </p>
        </article>
      </div>

      <div className="playground-foot" data-reveal="up">
        <span className="label">Small on purpose.</span>
        <p>One honest interaction is worth a thousand pretend metrics.</p>
      </div>
    </section>
  );
}
