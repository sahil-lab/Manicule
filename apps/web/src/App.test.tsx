import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("the local-first editorial workspace", () => {
  it("introduces the phased workspace without presenting future modules as available", () => {
    mockFetch(() => jsonResponse({}));
    render(<App />);
    expect(screen.getByRole("heading", { name: "Less guess. More yes." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Enter the workspace" })).toHaveAttribute(
      "href",
      "#workspace",
    );
    expect(screen.getByRole("link", { name: "Scroll to the idea" })).toHaveAttribute(
      "href",
      "#idea",
    );
    expect(screen.getByText(/PLANNED · PHASE 02/)).toBeVisible();
    expect(screen.getByText(/future ideas, not live features/)).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });

  it("shows database-backed readiness and explicitly non-persistent validation", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ valid: true, persisted: false, name: "Pet store", version: "1.0" }),
    );
    render(<App />);
    expect(await screen.findByText("OPERATIONAL")).toBeVisible();
    expect(screen.getByText("V1")).toBeVisible();
    fireEvent.change(screen.getByLabelText("API name"), {
      target: { value: "Pet store" },
    });
    fireEvent.change(screen.getByLabelText("Version"), { target: { value: "1.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Give it a check" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Pet store.+1\.0.+Nothing was saved\./,
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
    await screen.findByText("OPERATIONAL");
    fireEvent.click(screen.getByRole("button", { name: "Give it a check" }));
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
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.queryByText("OPERATIONAL")).not.toBeInTheDocument();
  });

  it("rejects a success-shaped response that claims data was persisted", async () => {
    mockFetch(() =>
      jsonResponse({ valid: true, persisted: true, name: "Pet store", version: "1.0" }),
    );
    render(<App />);
    await screen.findByText("OPERATIONAL");
    fireEvent.click(screen.getByRole("button", { name: "Give it a check" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The service returned an unexpected validation response.",
    );
  });

  it("fills a synthetic example and clears its validation result when edited", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({
        valid: true,
        persisted: false,
        name: "Synthetic pet store",
        version: "1.0.0",
      }),
    );
    render(<App />);
    await screen.findByText("OPERATIONAL");
    fireEvent.click(screen.getByRole("button", { name: "Fill a synthetic example" }));
    expect(screen.getByLabelText("API name")).toHaveValue("Synthetic pet store");
    expect(screen.getByLabelText("Version")).toHaveValue("1.0.0");
    fireEvent.click(screen.getByRole("button", { name: "Give it a check" }));
    expect(screen.getByLabelText("API name")).toBeDisabled();
    expect(await screen.findByRole("status")).toHaveTextContent("Nothing was saved.");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/preflight",
      expect.objectContaining({
        body: '{"name":"Synthetic pet store","version":"1.0.0"}',
      }),
    );
    fireEvent.change(screen.getByLabelText("API name"), {
      target: { value: "Another synthetic API" },
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
