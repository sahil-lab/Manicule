# Manicule: Agent-Readable API Documentation Benchmark

An original, local engineering prototype inspired by the public product area of Manicule.
This project is **not affiliated with Manicule** and does not claim access to private
company architecture, systems, or incidents.

## Current scope

Only **Phase 0 (contract and safety)** and **Phase 1 (working skeleton)** are authorized.
See [the phase plan](docs/PLAN.md) for verified status and
[verification evidence](docs/EVIDENCE.md) for actual commands and results.

The skeleton provides:

- A React/TypeScript editorial workspace with an explicitly non-persistent metadata check.
- A Java 21 / Spring Boot 3 API with health, readiness, validation, and database-backed
  schema status.
- PostgreSQL with a versioned Flyway migration and a non-superuser application role.
- Isolated, resource-limited local containers and automated unit, integration, and browser
  smoke tests.

The interface pairs oversized charcoal-and-citrus typography with an original dimensional
SVG sculpture, an interactive local playground, and expandable roadmap entries. The
sculpture responds to a mouse pointer and a keyboard-operable rotation slider. Decorative
motion can be paused and follows the operating system's reduced-motion preference;
scrolling remains native. No external font, image, animation library, or WebGL dependency
is required.

Service and migration status are checked on load and on request. A synthetic-example
button fills the metadata form without making a request; submission performs the real
local validation. Editing checked metadata clears the old result. The artwork and planned
features are explicitly distinguished from working functionality and are never presented
as measured benchmark data.

It does **not** ingest specifications, create benchmarks, invoke agents, execute generated
code, or produce benchmark scores. Those capabilities are future phases, not hidden or
simulated features.

## Local prerequisites

- Docker Desktop running Linux containers, with Docker Compose v2 or newer.
- PowerShell (Windows PowerShell 5.1 or PowerShell 7).
- Free loopback ports **18107** (web) and **18207** (API).
- Internet access for the initial public image/dependency downloads only.

No host Node, npm, Java, Maven, PostgreSQL, or Python application runtime is required.
Build and test tooling runs in containers. Do not replace host runtimes.

From PowerShell:

```powershell
Set-Location C:\Users\upadhsah\Desktop\project\Manicule
.\scripts\Start.ps1
.\scripts\Verify.ps1
```

`Start.ps1` creates two random local database credentials under `.local` on first use,
compiles source in memory/CPU-limited tooling containers, packages the application images,
starts only Compose project `manicule`, and waits for health checks. Missing credentials
with existing data cause an explicit error, not an implicit reset. It never prints the
credentials. Do not upload `.local`. `Verify.ps1` runs formatting, type/lint checks, unit
and PostgreSQL integration tests, production builds, and an actual Chromium E2E smoke
test. It exits nonzero on failure and writes local evidence to `artifacts`.

- Workspace: <http://localhost:18107>
- API status: <http://localhost:18207/api/status>
- Liveness: <http://localhost:18207/actuator/health/liveness>
- Database-aware readiness: <http://localhost:18207/actuator/health/readiness>
- Implemented contract: [OpenAPI](packages/contracts/openapi.yaml)

The nginx gateway publishes both loopback ports: 18107 serves the frontend and proxies its
API calls; 18207 forwards only to the fixed API upstream. The API and database have **no
directly published host ports** and attach only to the private internal network. Only
nginx joins an additional ingress network, required for working Docker Desktop port
publication. That network permits egress; nginx has no user-configurable upstream or
execution feature. See the explicit residual boundary in the threat model.

The separate build/test network is only for trusted dependency installation and tooling;
it is not an execution sandbox for generated code. Use `Start.ps1` or `Verify.ps1` to
build source before packaging images; bare `docker compose build` expects the compiled JAR
and frontend bundle to exist.

## Layout

```text
apps/web              React + TypeScript dashboard
services/api          Spring Boot API and Flyway migration
packages/contracts    Implemented OpenAPI contract
infra/docker          Compose, Dockerfiles, nginx, database initialization
tests/e2e             Real-browser smoke and API boundary tests
scripts               Project-scoped PowerShell lifecycle and verification
docs                  Requirements, architecture, safety, decisions, evidence
```

Worker services, Redis, Kafka, and benchmark datasets are deliberately deferred. No cloud
resources or real user data are involved. Git initialization, commits, remotes, pushes,
and hosted CI execution require separate authorization.

## Development and shutdown

See [coding conventions](docs/CONVENTIONS.md) for containerized commands,
[architecture](docs/ARCHITECTURE.md) for interfaces, and
[the threat model](docs/THREAT_MODEL.md) for trust boundaries.

To stop **only this project's** containers while retaining local data:

```powershell
docker compose -p manicule -f .\infra\docker\compose.yaml stop
```

Do not use volume deletion, global Docker pruning, or commands targeting other projects. A
data reset is destructive and requires explicit approval.

## Limitations

This is not production-ready. There is no authentication or multi-tenancy. Only synthetic
metadata belongs in this local skeleton. Full tracing, authorization, rate limiting,
idempotent domain writes, sandboxing, reproducible benchmark scores, and a deployment/demo
package are later-phase work. Do not interpret passing skeleton tests as benchmark
accuracy or sandbox safety.
