import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CollectorDashboard from "./CollectorDashboard.jsx";

describe("CollectorDashboard", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch").mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    window.fetch.mockRestore();
  });

  it("renders collector dashboard header and tables", () => {
    render(<CollectorDashboard />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Overfilled Bins/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Daily Collection Overview/i)).toBeInTheDocument();
  });
});
