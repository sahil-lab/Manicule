# Verification evidence

Latest result: **23 tests and 31 integrated checks passed** for the
[sculptural UI redesign](#sculptural-ui-redesign--verified). Earlier runs below are
retained as historical evidence.

## Initial observations

- Source guide: `07_Manicule_Docs_Benchmark.pdf`, 3 pages, all extracted text read
  (sections 01-12, including all later-phase prompts).
- SHA-256: `AC7E47B2F6A4B40FF4E1079DB0E46E2A395B2A3B33C4AD2F6E094039B643EAA0`.
- Initial project contained only that PDF; no Git directory or source files.
- `docker version`: Engine 29.4.1, Docker Desktop 4.71.0, Linux engine responsive.
- `docker compose version`: v5.1.3.
- `docker info`: 16,467,517,440 bytes memory, 22 CPUs available to Docker.
- Initial listener check: ports 18107 and 18207 free.
- Host Python 3.12.10 plus the already installed `pypdf` was used only to read the
  supplied PDF. No host application tooling was installed or replaced.
- Public registry metadata: latest stable Spring Boot 3.5 entry was 3.5.16; npm reported
  React 19.3.1, Vite 8.3.8, TypeScript 7.0.2, Vitest 5.1.0, Playwright 1.65.0, Prettier
  3.9.10 at inspection.

## Phase 0 checkpoint

Requirements, architecture, safety, non-goals, acceptance criteria, conventions, ignore
rules and a CI definition were written before any application scaffolding. Git
initialization is intentionally not performed. The contract review confirmed that the
planned slice satisfies the guide's health, migration, validation, and smoke-test
requirements without introducing Phase 2 domain behavior. Phase 0 is complete; application
implementation begins only after this checkpoint.

## Phase 1 execution

**Phase 1 verified complete.** Historical failures and fixes are retained below. The final
integrated gate exited 0; results and exact commands follow.

### First gate and recovered failure

Command: `.\scripts\Verify.ps1 -Format`.

- Prettier, Spotless formatting, ESLint, TypeScript compilation, Vite production build,
  and all 4 frontend unit tests passed.
- PostgreSQL initialization failed with exit 126: a Windows bind-mounted shell script had
  a CRLF shebang (`/bin/sh^M`). The persistent cluster was initialized, but neither the
  `manicule` application role nor database existed.
- Fixed the root cause by replacing the shell init with a native PostgreSQL SQL init file
  (portable across line endings). Strengthened database health from `pg_isready` to an
  authenticated application-role `SELECT 1`; the original readiness probe could report a
  listening server before the target DB existed.
- Inspected the existing cluster: `role=0`, `database=0`. Applied only the missing
  role/database creation, then observed a healthy database. No data or volume was deleted,
  no password was reset, and no other project was touched.
- Added a fresh-bootstrap regression check using an isolated temporary filesystem; it must
  pass before final completion. It does not reuse or reset the real DB.

Exact additive recovery commands (historical evidence, **do not rerun against an already
initialized database**):

```powershell
docker compose -p manicule -f .\infra\docker\compose.yaml up -d db
docker compose -p manicule -f .\infra\docker\compose.yaml exec -T db psql -U postgres -d postgres -tAc "SELECT 'role=' || count(*) FROM pg_roles WHERE rolname = 'manicule' UNION ALL SELECT 'database=' || count(*) FROM pg_database WHERE datname = 'manicule'"
docker compose -p manicule -f .\infra\docker\compose.yaml exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/10-manicule.sql
docker compose -p manicule -f .\infra\docker\compose.yaml up -d --wait --wait-timeout 90 db
docker compose -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps api-check mvn -B -ntp spotless:check verify
```

The first failed gate's transcript remains in `artifacts/verification.log`. Subsequent
gates use timestamped transcripts so failures are not overwritten.

### Subsequent fixes and targeted verification

- Java request tests exposed Jackson's default number-to-string coercion: numeric `name`
  input returned HTTP 200 despite the scalar-coercion setting. Added an explicit String
  coercion policy for integers, floats, and booleans, and reject trailing JSON documents.
  The existing negative test now passes. Added an exact boundary case accepting
  80-character names, 40-character versions, and an 8192-byte request while rejecting
  values over those limits.
- `mvn -B -ntp spotless:apply spotless:check verify` passed: **8 unit tests and 4
  integration tests**, zero failures/errors/skips, real PostgreSQL, packaged JAR. The
  first coercion failure is preserved in `artifacts/api-validation-first-failure.xml`.
- The fresh SQL-bootstrap regression check passed on tmpfs with
  `current_database=manicule`, `rolname=manicule`, `rolsuper=f`. The temporary container
  was stopped and removed; persistent data was untouched.
- Actual Windows curl probes failed despite healthy internal-only containers and declared
  `HostConfig.PortBindings`; `NetworkSettings.Ports` had empty bindings. Changed ingress
  to fixed-upstream nginx publishing both loopback ports, leaving Java/PostgreSQL
  internal-only. Documented nginx's egress-capable ingress exception in the architecture
  and threat model rather than claiming total runtime egress denial.
- The first gateway configuration had a misplaced nested `server` block; nginx rejected
  it. Corrected the placement and reran `nginx -t` successfully.
- E2E TypeScript caught an unsupported `APIRequestContext.options` method. Used the
  supported `fetch(..., { method: "OPTIONS" })` API.
- Added a shared nginx 413 problem response so the published API preserves its JSON error
  contract instead of substituting an HTML gateway error.
- `docker compose -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps e2e`
  passed all **3 real Chromium/API smoke tests**, including mobile overflow, browser
  happy/failure paths, strict inputs, deferred-route 404, CORS and direct chunked-body
  limits. Screenshot: `artifacts/e2e/dashboard.png`.
- Windows probes returned `ok` from 18107 and
  `{"service":"manicule","phase":1,"schemaVersion":1}` from 18207.

### Shared-engine interruption

An initial execution of the documented startup command reached its 180-second health wait
and failed while the shared Docker engine became unresponsive to subsequent inspect/log
requests. Host process presence was checked read-only; no Docker restart, global stop,
pruning, or host runtime change was attempted. After the engine responded again
(`GET /_ping`: HTTP 200), the full verification and the documented startup command both
passed with the original limits. The unsuccessful startup transcript remains in
`artifacts/startup.log`.

## Final verified results

Command: `.\scripts\Verify.ps1`. Exit code: **0**. UTC interval: **2026-11-11T17:49:37Z to
17:52:11Z** (about 155 seconds for this warm local verification run, not a performance
benchmark).

| Check                        | Observed result                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Docker / Compose config      | Responsive Linux engine; project `manicule`; valid configuration                                                             |
| Prettier / Spotless          | Formatting checks passed                                                                                                     |
| ESLint / TypeScript          | Zero lint errors; frontend and E2E type checks passed                                                                        |
| Frontend unit tests          | 4 passed                                                                                                                     |
| Java request unit tests      | 8 passed, 0 failures/errors/skips                                                                                            |
| PostgreSQL integration tests | 4 passed, 0 failures/errors/skips                                                                                            |
| Chromium/API E2E             | 3 passed; actual production nginx/API/database, no service mocks                                                             |
| Builds                       | Vite production bundle, executable JAR and both runtime images succeeded                                                     |
| Fresh DB bootstrap           | SQL initializer succeeded on independent tmpfs; restricted app role verified                                                 |
| Migration                    | Exactly one successful V1; technical marker persisted; no domain tables                                                      |
| Host access                  | 18107 web HTTP 200; 18207 status/readiness HTTP 200                                                                          |
| Isolation                    | DB/API internal-only, no directly published ports; nginx alone publishes 127.0.0.1:18107 and :18207                          |
| Runtime constraints          | Every service has positive CPU/memory/PID limits, non-root user, read-only root, all capabilities dropped, no-new-privileges |
| Deliberate DB outage         | Readiness HTTP 503; status HTTP 503 with `Database unavailable`; liveness HTTP 200                                           |
| Recovery                     | DB restarted in `finally`; original marker unchanged; all three runtime services healthy                                     |

Total: **19 tests** and **31 recorded verification checks**. The separate
`.\scripts\Start.ps1` rerun exited 0 and passed host probes, preserving credentials and
data. Its transcript is `artifacts/startup-verified.log`. That startup script packages
without running tests; all tests above were run separately by the full verification gate,
without skipping.

### Reproduce

```powershell
Set-Location C:\Users\upadhsah\Desktop\project\Manicule
.\scripts\Start.ps1
.\scripts\Verify.ps1
```

To apply formatting and then verify, use `.\scripts\Verify.ps1 -Format`. The complete
executed command stream is in `artifacts/verification-20261111T174937Z.log`; the standard
gate expands to:

```powershell
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml config --quiet
docker compose -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps web-check npm ls --depth=0
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps web-check sh -c 'npm run format:check && npm run lint && npm run test && npm run build'
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml up -d --wait --wait-timeout 90 db-bootstrap-check
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml exec -T db-bootstrap-check psql -U postgres -d manicule -v ON_ERROR_STOP=1 -c "SELECT current_database(), rolname, rolsuper FROM pg_roles WHERE rolname = 'manicule'"
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml stop db-bootstrap-check
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml rm -f db-bootstrap-check
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml up -d --wait --wait-timeout 90 db
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps api-check mvn -B -ntp spotless:check verify
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml build api web
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml up -d --wait --wait-timeout 180 db api web
docker compose --ansi never -p manicule -f .\infra\docker\compose.yaml run --rm --no-deps e2e
```

The script then asserts actual container settings and host HTTP results and runs the DB
outage/recovery in a `try/finally`. Use the script for this scenario rather than leaving a
database stopped with an incomplete manual sequence. `nginx -t` was also explicitly run
successfully using a temporary `web` container.

### Toolchain and persistent evidence

- Build: Node **22.23.4**, npm **10.9.9**, TypeScript **6.0.3**, Maven **3.9.11**, build
  JDK **21.0.9**, Spring Boot **3.5.16**.
- Runtime: Temurin **21.0.13**, PostgreSQL **17.11**.
- Frontend: React **19.3.1**, Vite **8.3.8**; tests: Vitest **5.1.0** and Playwright
  **1.65.0**. Exact npm dependency graph is in the lockfile.
- Runtime image IDs observed at the integrated verification boundary:
  - API: `sha256:5268816185e15378b30430f8cb753440c67fda65c2f73bc2365b5c28eae41b76`
  - Web: `sha256:f2ec947731823bd9d8261f01dd29ee62bd4613a82ccec8a4fd9d24a7cd5491c0`
  - PostgreSQL: `sha256:3540c0362c809df084ffac0ae69fe794515f9de92692f02178bcdce0ef0302ac`
    Repackaging in the subsequent startup run changes image attestation IDs, not the
    verified application content; that run's IDs are in its own transcript.

Reports and artifacts:

- `artifacts/verification.json`: final pass status and all 31 checks.
- `artifacts/verification-20261111T174937Z.log`: complete successful transcript.
- `artifacts/startup-verified.log`: documented startup command and host probes.
- `services/api/target/surefire-reports/TEST-local.manicule.PreflightControllerTest.xml`.
- `services/api/target/failsafe-reports/TEST-local.manicule.SkeletonIT.xml`.
- `artifacts/e2e/results.xml`, `artifacts/e2e/report/index.html`.
- `artifacts/e2e/dashboard.png`: actual full-page Chromium screenshot.
- Earlier failure evidence is retained; `.local` credentials are never included.

## Blockers, limitations and next phase

No remaining blocker for Phase 0/1. Shared Docker availability and the reserved loopback
ports remain prerequisites. CI is configured but **not run on a hosted service**; no Git
repository was initialized and no commits/remotes/pushes were created. No dependency
vulnerability audit, production-readiness assessment, or business benchmark is claimed.

No real data, cloud resources, external API execution, agents, or generated-code sandbox
were used. nginx's ingress network permits egress and is not an execution sandbox;
backend/database remain internal-only. All persistent source and evidence belong to
Manicule. Temporary bootstrap/test containers were removed, and the three intended runtime
services remain available.

Next: **Phase 2 only after a new instruction**, beginning with identity/permission,
API-version ownership, idempotency, and state-transition decisions. Domain tables and
business routes remain unimplemented. Later benchmark criteria are pending, not
zero-valued or fabricated scores.

## UI art-direction update

The Phase 1 frontend was re-art-directed as an editorial, cinematic landing page without
changing the backend contract or introducing Phase 2 behavior. The page now pairs a dark
forest-green hero and CSS-drawn orbital workflow concept with an editorial manifesto, the
live service/database health panel, the working non-persistent metadata check, and clearly
labelled future-phase concepts. Typography and visual effects use local CSS and system
fonts; no external assets or services are requested. Invented geographic coordinates were
removed.

**Verification:** `.\scripts\Verify.ps1` exited 0 on 2026-11-11. The latest run began at
`2026-11-11T20:26:30Z` and completed at `2026-11-11T20:30:33Z`. The frontend passed
Prettier, ESLint, TypeScript, its **5 unit tests**, and its production build. The API
passed **8 unit tests and 4 PostgreSQL integration tests**; Chromium/API E2E passed **3
tests**. The integrated gate recorded **31 checks** and generated the updated full-page
Chromium capture at `artifacts/e2e/dashboard.png`. Its assertions cover the new copy and
navigation, real service status, successful and invalid metadata checks, no external
browser requests, and no horizontal overflow at 390 px and 360 px.

After the gate, the updated production page was reloaded from `http://localhost:18107/`:
HTTP 200, title `Manicule — API clarity, measured`, the new hero heading, and live
`OPERATIONAL` stack state were observed. A 360 px viewport retained the working form
button and had no document overflow. `http://localhost:18207/api/status` remained covered
by the integrated gate. Phase scope remains 0/1; no domain behavior was added.

## Sculptural UI redesign — verified

The previous visual direction was replaced in response to the request for a more
distinctive, Awwwards-inspired experience. The result uses oversized editorial type,
charcoal/citrus contrast, an original shaded dimensional SVG object, illustrated
principles, a real local playground, native roadmap disclosures, and a large typographic
footer. It is original artwork, not a copied site or an award/rating claim.

The earlier hero had a concrete styling defect: its `.hero h1` selector did not match the
`.hero-section` element, so the heading actually rendered at **32 px**. Functional tests
had not caught this. The rebuilt heading is explicitly styled, and the browser regression
now checks its computed size is at least **100 px at a 1280 px viewport**. It also
measures actual text bounds, not just the heading's block box.

### Current verification boundary

Command: `.\scripts\Verify.ps1`. **Exit code 0**. UTC interval: `2026-11-12T01:03:49Z` to
`2026-11-12T01:28:04Z`. Timing is recorded for provenance, not as a performance benchmark.

| Check                             | Result                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Prettier / Spotless / ESLint      | Passed                                                                                     |
| Frontend and E2E TypeScript       | Passed                                                                                     |
| Frontend unit tests               | 6 passed                                                                                   |
| Java request tests                | 8 passed, no failures/errors/skips                                                         |
| Real PostgreSQL integration tests | 4 passed, no failures/errors/skips                                                         |
| Chromium/API E2E                  | 5 passed against production nginx/API/database                                             |
| Builds                            | Vite bundle, executable JAR, and runtime images passed                                     |
| Integrated runtime checks         | 31 passed; resource limits, isolation, host ports, bootstrap, outage and recovery retained |

Browser coverage includes:

- The primary CTA really navigates to the local workspace. Synthetic-example fill, real
  validation, invalid input, explicit API failures, and non-persistence are checked.
- Editing previously checked metadata removes stale success feedback. Inputs are disabled
  while the corresponding validation request is pending.
- Decorative animation runs by default, can be stopped, and responds to a changed
  operating-system reduced-motion preference. User-directed keyboard rotation still works
  with motion reduced.
- The skip link moves keyboard focus to the main landmark. Roadmap disclosures open and
  close with the keyboard and remain explicitly planned/not implemented.
- Viewports **1440, 1024, 768, 390, 360, and 320 px** have no document overflow or clipped
  hero text. The test compares with `documentElement.clientWidth`, avoiding the earlier
  scrollbar-width blind spot.
- The primary browser flow produced no external requests or unhandled page errors.

The final desktop, full-page, and mobile captures were visually inspected. The first
sculpture material was refined to reduce harsh checkerboarding, caption spacing was
increased, and the off-screen skip link was made fully transparent until focused so it
does not leak into a scrolled full-page screenshot.

After the integrated gate, the shared host browser was reloaded from
`http://localhost:18107/`: HTTP **200**, heading **Less guess. More yes.**, and live
**OPERATIONAL** state. Its desktop headline computed to **131.04 px** at a 1440 px
viewport. Actual mouse movement produced sculpture tilt of **3.5 degrees X / 5.4 degrees
Y**, which reset on pointer exit. With Windows' scrollbar at a 360 px viewport, document
and client widths were both **345 px**, with all hero text inside the viewport. The
browser was restored to desktop size afterward.

### Commands and retained evidence

The final source polish was formatted before the gate with:

```powershell
Set-Location C:\Users\upadhsah\Desktop\project\Manicule
. .\scripts\Common.ps1
Invoke-ManiculeCompose -Arguments @('run','--rm','--no-deps','web-check','sh','-c','npm exec -- prettier --write apps/web/src/ClaritySculpture.tsx apps/web/src/styles.css tests/e2e/smoke.spec.ts')
.\scripts\Verify.ps1
```

The gate's full command expansion is retained in
`artifacts/verification-20261112T010348Z.log`; `artifacts/verification.json` records its
pass status and every integrated check. Additional evidence:

- `artifacts/ui-direction-check.log`: focused formatter/lint/unit run and the initial
  TypeScript failure. Strict indexed access rejected an inferred point array; an explicit
  four-point tuple fixed it without disabling checks or using assertions.
- `artifacts/ui-direction-build.log`: subsequent successful TypeScript/Vite build and
  project-scoped web image publication.
- `artifacts/ui-direction-e2e.log`: the first five-test real-browser pass before the final
  material/spacing polish.
- `artifacts/e2e/results.xml` and `artifacts/e2e/report/index.html`: final browser
  results.
- `artifacts/e2e/hero-desktop.png`, `hero-mobile.png`, `workspace-mobile.png`, and
  `dashboard.png`: final production screenshots.
- Java unit/integration XML reports remain under `services/api/target`.

An initial shell invocation incorrectly combined redirected native stderr with
PowerShell's terminating-error policy. It was rerun using `Start-Transcript`; no project
helper or runtime was changed to conceal the failure.

**Blockers: none for this UI update.** The existing Phase 1 API contract and
local/non-persistent scope are preserved. No dependency was added, no host runtime was
replaced, and no other project, Git repository, cloud resource, or real user data was
touched. The three intended Manicule runtime containers are healthy; temporary
verification containers were removed. Phase 2 remains unimplemented and requires a
separate instruction.
