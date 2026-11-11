export type SystemStatus = {
  service: "manicule";
  phase: 1;
  schemaVersion: number;
};

export type Metadata = { name: string; version: string };
export type PreflightResult = Metadata & { valid: true; persisted: false };

export class ApiProblem extends Error {
  readonly errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiProblem";
    this.errors = errors;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const signals = [AbortSignal.timeout(8000)];
  if (options.signal) signals.push(options.signal);
  const response = await fetch(path, {
    ...options,
    signal: AbortSignal.any(signals),
  });
  if (!response.headers.get("content-type")?.includes("json")) {
    throw new ApiProblem(
      `The service returned a non-JSON response (HTTP ${response.status}).`,
    );
  }
  const body: unknown = await response.json();
  if (!response.ok) {
    const errors: Record<string, string> = {};
    if (isObject(body) && isObject(body.errors)) {
      for (const [field, message] of Object.entries(body.errors)) {
        if (typeof message === "string") errors[field] = message;
      }
    }
    const message =
      isObject(body) && typeof body.detail === "string"
        ? body.detail
        : `The request failed (HTTP ${response.status}).`;
    throw new ApiProblem(message, errors);
  }
  return body;
}

export async function loadStatus(signal: AbortSignal): Promise<SystemStatus> {
  const [status, readiness] = await Promise.all([
    request("/api/status", { signal }),
    request("/actuator/health/readiness", { signal }),
  ]);
  if (
    !isObject(status) ||
    status.service !== "manicule" ||
    status.phase !== 1 ||
    typeof status.schemaVersion !== "number" ||
    !Number.isInteger(status.schemaVersion) ||
    status.schemaVersion < 1 ||
    !isObject(readiness) ||
    readiness.status !== "UP"
  ) {
    throw new ApiProblem("The service returned an unexpected readiness response.");
  }
  return { service: "manicule", phase: 1, schemaVersion: status.schemaVersion };
}

export async function validateMetadata(metadata: Metadata): Promise<PreflightResult> {
  const body = await request("/api/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  if (
    !isObject(body) ||
    body.valid !== true ||
    body.persisted !== false ||
    typeof body.name !== "string" ||
    typeof body.version !== "string"
  ) {
    throw new ApiProblem("The service returned an unexpected validation response.");
  }
  return { valid: true, persisted: false, name: body.name, version: body.version };
}
