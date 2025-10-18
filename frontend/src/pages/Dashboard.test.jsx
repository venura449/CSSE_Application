import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Dashboard from "./Dashboard.jsx";


vi.mock("leaflet", () => ({
  map: vi.fn(() => ({
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn(),
    fitBounds: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
  marker: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  })),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch");
    window.fetch.mockReset();
    localStorage.clear();
  });

  afterAll(() => {
    window.fetch.mockRestore();
  });

  it("renders fallback when Recharts is available (smoke)", () => {
    render(<Dashboard />);
    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
  });
});
