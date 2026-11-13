# Ordered execution plan and persistent status

## Execution boundary

Only Phase 0 and Phase 1 are authorized. Guide read completely: 3 pages, sections 01-12.
No other project/session is activated. All authored files stay under
`C:\Users\upadhsah\Desktop\project\Manicule`.

| Phase | Scope                                                                               | Status                                                           |
| ----- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0     | Requirements, architecture, safety, non-goals, criteria, conventions, CI definition | Complete: contract reviewed before application scaffolding       |
| 1     | Web/API/PostgreSQL skeleton, health, migration, validation, E2E                     | Complete; the final lens UI source passed 26 tests and 31 checks |
| 2     | Domain entities, contracts, permissions, idempotency, transitions                   | Not authorized / not started                                     |
| 3     | Ingestion, task generation, local execution, failure classification                 | Not authorized / not started                                     |
| 4     | Bounded agent adapters and automation                                               | Not authorized / not started                                     |
| 5     | Reliability, full telemetry, failure scenarios, performance                         | Not authorized / not started                                     |
| 6     | Real benchmarks, demo, limitations, packaging                                       | Not authorized / not started                                     |

## Phase 0 gate

- [x] Read every page of the specified PDF and inspect the initially empty project.
- [x] Verify Docker Engine and Compose; check reserved ports.
- [x] Document stories, implemented-versus-future interfaces, and measurable gates.
- [x] Document architecture, private network, resource budgets and ownership.
- [x] Document threat model, non-goals, human approval boundaries and deferred work.
- [x] Establish ignore rules, coding conventions and CI configuration.
- [x] Do not initialize Git: approval was for another project only.
- [x] Finish explicit contract review before application implementation.

## Phase 1 gate

- [x] Scaffold Java 21 / Spring Boot 3 API and React / TypeScript dashboard.
- [x] Run real PostgreSQL with restricted app role and Flyway V1.
- [x] Add health/readiness, migrated schema status and non-persistent validation.
- [x] Add isolated Compose runtime and reproducible project-local scripts.
- [x] Run formatter, lint/type check, unit/integration tests and production builds.
- [x] Run real Chromium E2E happy and failure paths.
- [x] Verify host ports, no DB publication, runtime resource/security controls.
- [x] Verify DB outage readiness and recovery without data loss.
- [x] Persist exact evidence, changed-file inventory, blockers and next phase.

## Verified handoff

Latest complete run: `.\scripts\Verify.ps1`, exit 0, 2026-11-13 09:05:57-09:18:04 UTC, on
the final source of the liquid lens redesign: 8 frontend tests, 8 Java unit tests, 4
PostgreSQL integration tests and 6 Chromium/API E2E tests, plus all 31 integrated checks.
Two earlier complete runs on this redesign passed with 24 tests each; one run in between
failed at image packaging shortly before the host was restarted, with the cause not
established. The documented `.\scripts\Start.ps1` command was verified during the original
Phase 1 handoff and used again after the first of two host restarts on 2026-11-13; after
the second, the three services were started directly with Compose from the verified
images. This work performed no hosted CI run, cloud work, Git initialization, commit,
remote, push, real-data access, volume deletion, or other-project operation. A Git
repository with a GitHub remote was nevertheless found in the folder on 2026-11-13,
created outside this work. Its last commit predates this redesign, which is uncommitted;
the evidence file gives the details.

See [evidence and exact commands](EVIDENCE.md), [the changed-file inventory](CHANGES.md),
and [machine-readable results](../artifacts/verification.json).

Blocking issue: **none.** The services do not restart by themselves, so after a host or
Docker engine restart the site is down until `.\scripts\Start.ps1` is run. This session
did not start, restart or clean up the shared engine; when it was found stopped, the user
was asked, and it was already starting when checked. An earlier engine-unresponsive
interval likewise failed the startup wait rather than being silently treated as success,
and the unmodified threshold passed after the engine recovered.

Limitations: unauthenticated local-only prototype; nginx ingress has an explicit
egress-capable network boundary; mutable base tags; no hostile-code sandbox, benchmarks,
or production-readiness claim. The hero's frame rate on a hardware GPU was measured before
the last lens edits and not again after them.

## Next phase after successful verification

Stop after Phase 1. Phase 2 requires a new instruction and decisions about
identity/permissions, API-version ownership, idempotency keys and state transitions before
implementing the domain tables or advertised business APIs. Do not add agent or benchmark
functionality under the label "skeleton."
