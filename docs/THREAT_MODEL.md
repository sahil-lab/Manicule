# Threat model and safety contract

## Assets, trust, and assumptions

Assets are local source, synthetic metadata, database credentials, the persistent
development database, and neighboring projects' resources. The browser is an untrusted
input source. Public packages and container registries are supply-chain boundaries.
PostgreSQL is private; a local machine administrator is trusted.

This unauthenticated skeleton is for one developer on a trusted machine. It is not
suitable for LAN exposure, multi-user hosting, real API documentation, secrets, or
production. Loopback publishing is not authentication. Processes already running on the
host may call the loopback API.

## Controls and verification

| Threat                         | Phase 1 control                                                                                                                                                       | Evidence / residual risk                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Unbounded or malformed input   | Bounded validated fields, strict JSON, bounded request body, explicit problems                                                                                        | Negative API tests; production rate limits are deferred                 |
| SQL or template injection      | Preflight never executes or persists metadata; status SQL is fixed; React escapes displayed text                                                                      | Unit and browser checks; domain query review remains Phase 2            |
| SSRF and generated-code escape | No URL input, agent adapter, executor or subprocess API; runtime network is internal                                                                                  | API route tests and network assertions; this is not an executor sandbox |
| Database exposure              | No host port, private network, distinct admin/app secrets, restricted app role                                                                                        | Compose and integration assertions; app still owns its local database   |
| Secret disclosure              | Random local files ignored by Git/Docker build contexts, config-tree injection, no body/secret logging                                                                | Do not print or attach `.local`; local admins can read runtime secrets  |
| Cross-origin drive-by mutation | No domain mutations; JSON-only preflight; no permissive CORS; same-origin frontend proxy                                                                              | API content-type/origin tests; real auth/CSRF policy deferred           |
| Browser script injection       | React text rendering; nginx CSP, nosniff, no frames and restrictive referrer policy                                                                                   | Browser/header tests; no HTML/Markdown rendering                        |
| Resource exhaustion            | Per-service CPU/memory/PID limits, small connection pool, bounded tests, request-size cap                                                                             | Configuration assertions; no throughput/SLO claim                       |
| Container privilege escalation | Non-root API/web, no Docker socket, read-only app filesystems, dropped capabilities, no-new-privileges                                                                | Runtime assertions; Docker/host security is an external prerequisite    |
| Other-project interference     | Explicit project name, dedicated ports/networks/volumes, project-local authored files                                                                                 | Scripts only invoke `-p manicule`; never global prune/stop              |
| Data loss                      | Additive migration, persistent named volume, no clean/down-volumes/reset automation                                                                                   | Reset and destructive rollback require human approval                   |
| Dependency compromise          | Versioned dependencies and npm lockfile; trusted tooling separate from runtime network; the three font packages ship CSS and font files only and add no executed code | No claim of a complete supply-chain audit or vulnerability scan         |

## Ingress exception and tested isolation

Only the fixed-upstream nginx gateway joins both `manicule_edge` and the internal
`manicule_runtime` network. This is necessary because the observed Docker Desktop engine
left internal-only port bindings unpublished and unreachable from Windows. nginx serves
18107 and forwards 18207 exclusively to `api:8080`. The API and database have no direct
host publications and no outbound-capable network attachment.

The ingress network permits egress. We do **not** claim that nginx has an OS-level egress
deny policy, or that this stack can sandbox hostile code. nginx accepts no dynamic
upstream, URL fetch, CONNECT proxy, script execution, or generated code. Future agents and
executors must never join this ingress network. Runtime assertions check actual published
bindings and real host HTTP requests, not just desired Compose configuration.

## Response and logging

Validation failures contain field names and safe constraints, not rejected values.
Malformed JSON, unsupported media, unknown routes, and database failure have explicit
non-2xx responses. Error logs must not dump bodies or credentials. Request IDs are
generated server-side rather than trusting arbitrary incoming log identifiers. Health
endpoints expose aggregate status only.

## Approval gates

Do not perform any of the following without explicit, separate authorization:

- Initialize Git; commit, create a remote, push, merge, or publish source.
- Deploy to cloud, incur cloud spend, access real user data or private systems.
- Delete databases, volumes, source, or other projects' resources.
- Expose the app beyond loopback or introduce authenticated multi-user behavior.
- Add agent providers, arbitrary remote target fetching, or generated-code execution.
  Those require a new sandbox design and tests before implementation.

## Future execution boundary

The future engine must run only against synthetic local mock APIs. It must reject
arbitrary external requests, enforce executable and network allowlists, bound runtime and
outputs, isolate credentials/files, and record reproducible traces. An internal Compose
network alone is not a sufficient sandbox for hostile code. Those capabilities and their
verification are **not implemented in Phase 1**.
