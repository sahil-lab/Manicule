# Requirements and acceptance contract

## Authority and product

Source: all three pages, sections 01-12, of `07_Manicule_Docs_Benchmark.pdf`. The
engineering prompt is applied as an original prototype, not an official company
specification. The user's current execution boundary overrides the guide's later
implementation, commit, and deployment instructions: **execute Phase 0, then Phase 1
only**.

The eventual product helps engineers discover documentation gaps that cause agents to
invent endpoints or parameters. It will ingest versioned OpenAPI and documentation,
generate tasks with known correct requests, run constrained agent adapters, execute
against local mock APIs, classify failures, and retest doc fixes.

## Users and stories

1. As a local developer, I can start a complete web/API/database skeleton without
   installing or replacing host Java or Node.
2. As an evaluator, I can see whether the API is ready and whether a real PostgreSQL
   migration has been applied.
3. As a developer, I can submit synthetic API name/version metadata and receive
   deterministic validation feedback, without creating a domain record.
4. As a reviewer, I can reproduce formatting, builds, unit/integration tests, and a
   browser happy-path and failure-path smoke test.
5. As the machine owner, I can run Manicule alongside other projects without published
   database ports, global cleanup, unbounded resources, or shared Compose names.

## Phase 0 deliverables

README, this requirements contract, architecture and trust-boundary diagram, threat model,
ordered plan, decisions, coding conventions, ignore rules, and a local-verification-backed
CI definition. No Git repository is initialized without separate approval.

## Phase 1 vertical slice

| Interface                        | Behavior                                                         |
| -------------------------------- | ---------------------------------------------------------------- |
| `GET /actuator/health/liveness`  | Process liveness; no secrets or component details                |
| `GET /actuator/health/readiness` | HTTP 200 only when the app and PostgreSQL are ready              |
| `GET /api/status`                | Read the migrated technical schema marker from PostgreSQL        |
| `POST /api/preflight`            | Validate name/version JSON; explicitly return `persisted: false` |
| Web dashboard                    | Display status and submit the synthetic metadata form            |

Metadata uses a nonblank name of at most 80 characters and a version identifier of 1-40
ASCII letters, digits, dots, underscores, plus signs, or hyphens, starting with a letter
or digit. Unknown fields, malformed JSON, invalid fields, and unsupported content types
must return explicit HTTP errors. The API never accepts a URL, OpenAPI document,
executable content, or credentials in this phase. Errors must not echo rejected values,
stack traces, SQL, or secrets.

The migration creates only a technical `skeleton_metadata` marker. Domain tables
`api_versions`, `endpoints`, `scenarios`, `agent_runs`, `execution_results`, and
`doc_issues` belong to Phase 2. The future routes `POST /apis`, `POST /benchmarks`, and
`GET /benchmarks/{id}/results` are **not implemented**. No fake successful responses are
allowed for deferred routes.

## Measurable gates

| ID    | Acceptance criterion                                                                                                                         | Verification                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P0-01 | Every guide page read; scope, assumptions, non-goals and safety recorded before application edits                                            | Guide fingerprint, phase log, document review              |
| P1-01 | All three runtime services become healthy within 180 seconds after images are built                                                          | Compose `up --wait --wait-timeout 180`                     |
| P1-02 | Web is reachable at loopback 18107; API at loopback 18207; database has no published ports                                                   | Host HTTP probes and container configuration assertions    |
| P1-03 | PostgreSQL has exactly the applied V1 migration and expected marker                                                                          | Integration tests against actual PostgreSQL and API status |
| P1-04 | Valid metadata returns 200, `valid: true`, and `persisted: false`; invalid metadata returns 400 with field errors                            | Java tests, browser/API E2E                                |
| P1-05 | Unknown fields and malformed JSON return 400; non-JSON input returns 415; deferred routes return 404                                         | Java and API E2E tests                                     |
| P1-06 | Formatting, frontend lint/type check, production builds, unit/integration tests, and real Chromium smoke all exit 0                          | Recorded tool reports and exit status                      |
| P1-07 | All runtime services have positive CPU/memory/PID limits and no elevated capabilities; API/DB are internal-only, nginx alone bridges ingress | Verification script assertions and actual host probes      |
| P1-08 | Browser presents readiness, valid feedback and invalid feedback with no uncaught errors                                                      | Browser smoke and failure artifact capture                 |
| P1-09 | Readiness becomes non-200 when this project's DB is stopped and recovers after restart                                                       | Scoped outage probe with guaranteed restart                |
| P1-10 | Application DB role is neither superuser nor role/database creator; validation does not change the marker                                    | PostgreSQL integration tests                               |

## Non-goals and stop boundary

- No Phase 2 domain CRUD, authentication, permissions, lifecycle, idempotency, or
  benchmark persistence.
- No specification ingestion, agents, LLM calls, generated-code execution, arbitrary
  network targets, Redis, Kafka, or worker runtime.
- No cloud, real user data, performance claims, benchmark scores, production deployment,
  Git actions, or modifications outside this project.
- No claim that local test execution is a hosted CI run.

## Later evaluation, not current results

The guide calls for hallucination rate, before/after execution success, and a repeatable
benchmark spanning at least three API versions. These cannot be measured until the domain
and execution engine exist. Record them as pending; never substitute synthetic success
counters for measured results.
