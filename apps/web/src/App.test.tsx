import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(preflight: () => Response) {
  const fetchMock = vi.fn((path: string) => {
    if (path === "/api/status") {
      return Promise.resolve(
        jsonResponse({ service: "manicule", phase: 1, schemaVersion: 1 }),
      );
    }
    if (path === "/actuator/health/readiness") {
      return Promise.resolve(jsonResponse({ status: "UP" }));
    }
    return Promise.resolve(preflight());
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("the local skeleton dashboard", () => {
  it("shows database-backed readiness and explicitly non-persistent validation", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ valid: true, persisted: false, name: "Pet store", version: "1.0" }),
    );
    render(<App />);
    expect(await screen.findByText("Local stack ready")).toBeVisible();
    expect(screen.getByText("Schema v1")).toBeVisible();
    fireEvent.change(screen.getByLabelText("API name"), {
      target: { value: "Pet store" },
    });
    fireEvent.change(screen.getByLabelText("Version"), { target: { value: "1.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Check metadata" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Metadata valid for Pet store (1.0). Nothing was saved.",
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/preflight",
      expect.objectContaining({ body: '{"name":"Pet store","version":"1.0"}' }),
    );
  });

  it("renders field errors without presenting a failed request as saved", async () => {
    mockFetch(() =>
      jsonResponse(
        {
          detail: "Correct the listed fields.",
          errors: { name: "Name is required.", version: "Version is required." },
        },
        400,
      ),
    );
    render(<App />);
    await screen.findByText("Local stack ready");
    fireEvent.click(screen.getByRole("button", { name: "Check metadata" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correct the listed fields.",
    );
    expect(screen.getByLabelText("API name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports an unavailable service instead of displaying healthy defaults", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stack unavailable: Network unavailable",
    );
    expect(screen.queryByText("Local stack ready")).not.toBeInTheDocument();
  });

  it("rejects a success-shaped response that claims data was persisted", async () => {
    mockFetch(() =>
      jsonResponse({ valid: true, persisted: true, name: "Pet store", version: "1.0" }),
    );
    render(<App />);
    await screen.findByText("Local stack ready");
    fireEvent.click(screen.getByRole("button", { name: "Check metadata" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The service returned an unexpected validation response.",
    );
  });
});
