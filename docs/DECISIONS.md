# Engineering decisions

| ID  | Decision                                                                                    | Reason / boundary                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Execute only Phases 0 and 1                                                                 | Explicit user scope overrides later guide prompts                                                                                   |
| D02 | Java 21, Spring Boot 3.5, React/TypeScript, PostgreSQL 17                                   | Guide architecture; mature local tooling, no host runtime replacement                                                               |
| D03 | Containerized Node 22 and Maven/Temurin 21                                                  | Host Node 14 is not a supported frontend build runtime; Java is not on PATH                                                         |
| D04 | Non-persistent `/api/preflight` plus DB-backed `/api/status`                                | Exercises validation and DB integration without prematurely implementing Phase 2                                                    |
| D05 | Flyway technical marker only                                                                | Proves migrations and persistence without inventing domain semantics                                                                |
| D06 | No Redis, Kafka, worker or agent runtime yet                                                | Phase 1 has no short-lived distributed state, async boundary, or executor                                                           |
| D07 | Compose project `manicule`; web 18107/API 18207 on 127.0.0.1; no DB host port               | Concurrent-project isolation and local safety                                                                                       |
| D08 | Internal API/DB network; fixed nginx ingress bridge; separate trusted tooling network       | API/DB have no external routing; nginx ingress egress is an explicit residual boundary                                              |
| D09 | Separate random admin/app credential files                                                  | No hard-coded credentials; app is not a PostgreSQL superuser                                                                        |
| D10 | No Git init or hosted CI execution                                                          | Manicule has no Git authorization; workflow file is preparation only                                                                |
| D11 | Use public stable dependency metadata and supported peer ranges, pin manifests and lockfile | TypeScript 6.0.3 is selected instead of 7.0.2 because typescript-eslint 8.72.2 requires TypeScript below 6.1                        |
| D12 | Real PostgreSQL integration and Chromium smoke                                              | Health stubs or mocked UI tests alone do not verify the expected outcome                                                            |
| D13 | Structured JSON logs and generated request IDs; full OTel later                             | Observable skeleton errors without introducing a collector or implying distributed tracing exists                                   |
| D14 | Preserve volumes/credentials; stop only named Manicule services                             | No destructive actions or neighboring-project interference                                                                          |
| D15 | Compile in limited tooling containers; Dockerfiles package generated JAR/bundle only        | Enforces build CPU/memory budgets and avoids duplicate dependency installs                                                          |
| D16 | nginx publishes both reserved loopback ports; API has no direct host binding                | Actual Docker Desktop host probes failed for internal-only published services; fixed ingress restores access without backend egress |
| D17 | Native SQL database bootstrap and an authenticated health query                             | Replaces a CRLF-sensitive Windows shell mount; tests real app-role/database readiness rather than only a listening server           |

Versions selected from the public npm/Maven registries will be recorded in the manifests
and evidence. Mutable base-image tags will have their actually used image IDs recorded;
byte-for-byte hermetic rebuilding is not claimed.

The guide's request to "create repository" is satisfied as a local project directory with
repository-ready files, not by silently initializing Git. A remote repository, commits,
and public publishing remain separate approval gates.
