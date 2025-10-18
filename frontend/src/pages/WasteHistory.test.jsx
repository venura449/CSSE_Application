import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import WasteHistory from "./WasteHistory.jsx";

describe("WasteHistory", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch");
    window.fetch.mockReset();
    localStorage.clear();
    // mock logged-in resident
    localStorage.setItem("token", "t");
    localStorage.setItem("user", JSON.stringify({ id: 1, role: "Resident" }));
  });

  afterAll(() => {
    window.fetch.mockRestore();
  });

  it("loads and displays schedules and requests lists (empty)", async () => {
    window.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    window.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<WasteHistory />);
    await waitFor(() =>
      expect(screen.getAllByText(/Scheduled Collections/i)[0]).toBeInTheDocument()
    );
    expect(
      screen.getAllByText(/No scheduled collections/i)[0]
    ).toBeInTheDocument();
    expect(screen.getByText(/Special Collection Requests/i)).toBeInTheDocument();
  });
});
