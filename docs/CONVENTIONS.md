# Coding and validation conventions

- Keep TypeScript strict and Java DTOs typed; do not bypass errors with `any`.
- Prefer small coherent vertical slices and existing framework mechanisms.
- Use LF line endings, UTF-8, two-space web/config indentation, and the Java formatter
  configured in Maven. Windows-mounted shell files must remain LF.
- Prettier formats documentation, JSON, YAML, CSS and TypeScript. ESLint checks the
  frontend. TypeScript and Maven compile production code. Spotless checks Java formatting.
  Do not edit generated bundles or lockfiles by hand.
- Generate/update the npm lockfile using the container's package manager; `npm ci`
  consumes it, not regenerates it.
- Add tests for success and explicit failure behavior; never swallow exceptions or return
  a successful default when dependencies fail.
- Never log credentials, complete request bodies, rejected values, or real data.
- Keep implementation aligned with the checked-in OpenAPI contract.
- Use comments only for non-obvious constraints.
- Keep all edits in Manicule; do not fix another project's runtime or dependency problems,
  modify host runtimes, or initialize Git.

## Standard entry points

```powershell
.\scripts\Start.ps1
.\scripts\Verify.ps1
```

Use `Verify.ps1 -Format` to apply formatters before running the same validation gate.
Default verification checks formatting without changing authored source. The script
records exact Compose commands and stops at the first failure.

The hosted workflow uses the same script, but no hosted CI success may be reported unless
an actual authorized run is observed. Docker build/test caches and named volumes are
Manicule-scoped and must not be globally pruned.

## Change reporting

At each verified phase boundary, update `PLAN.md`, `EVIDENCE.md`, and the changed-file
inventory. Distinguish executed checks from expected future checks. Report blockers and
limitations, including skipped phases. Commit/push only when separately requested.
