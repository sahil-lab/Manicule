import type { SystemStatus } from "./api";

export type Readiness =
  | { state: "loading" }
  | { state: "ready"; status: SystemStatus; checkedAt: Date; elapsedMs: number }
  | { state: "error"; message: string };

export type Submission =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "valid"; name: string; version: string }
  | { state: "error"; message: string; errors: Record<string, string> };
