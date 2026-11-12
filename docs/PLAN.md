# Ordered execution plan and persistent status

## Execution boundary

Only Phase 0 and Phase 1 are authorized. Guide read completely: 3 pages, sections 01-12.
No other project/session is activated. All authored files stay under
`C:\Users\upadhsah\Desktop\project\Manicule`.

| Phase | Scope                                                                               | Status                                                                   |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 0     | Requirements, architecture, safety, non-goals, criteria, conventions, CI definition | Complete: contract reviewed before application scaffolding               |
| 1     | Web/API/PostgreSQL skeleton, health, migration, validation, E2E                     | Complete: sculptural UI verified; 23 tests and 31 recorded checks passed |
| 2     | Domain entities, contracts, permissions, idempotency, transitions                   | Not authorized / not started                                             |
| 3     | Ingestion, task generation, local execution, failure classification                 | Not authorized / not started                                             |
| 4     | Bounded agent adapters and automation                                               | Not authorized / not started                                             |
| 5     | Reliability, full telemetry, failure scenarios, performance                         | Not authorized / not started                                             |
| 6     | Real benchmarks, demo, limitations, packaging                                       | Not authorized / not started                                             |

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

Latest integrated run: `.\scripts\Verify.ps1`, exit 0, 2026-11-12 01:03:49-01:28:04 UTC.
The sculptural UI redesign passed 6 frontend tests, 8 Java unit tests, 4 PostgreSQL
integration tests, and 5 Chromium/API E2E tests, plus all 31 integrated checks. Desktop
and mobile captures were visually inspected; keyboard, motion, pointer interaction, and
actual headline sizing were checked. All three runtime services remain healthy and
reachable. The documented `.\scripts\Start.ps1` command was also verified during the
original Phase 1 handoff. No hosted CI run, cloud work, Git initialization, commit,
remote, push, real-data access, volume deletion, or other-project operation was performed.

See [evidence and exact commands](EVIDENCE.md), [the changed-file inventory](CHANGES.md),
and [machine-readable results](../artifacts/verification.json).

Blocking issues: **none for the authorized local skeleton**. Shared Docker availability
remains a prerequisite; an earlier engine-unresponsive interval failed the startup wait
rather than being silently treated as success. The unmodified threshold passed after the
engine recovered. No global Docker restart or cleanup was performed by this session.

Limitations: unauthenticated local-only prototype; nginx ingress has an explicit
egress-capable network boundary; mutable base tags; no hostile-code sandbox, benchmarks,
or production-readiness claim.

## Next phase after successful verification

Stop after Phase 1. Phase 2 requires a new instruction and decisions about
identity/permissions, API-version ownership, idempotency keys and state transitions before
implementing the domain tables or advertised business APIs. Do not add agent or benchmark
functionality under the label "skeleton."
