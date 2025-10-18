import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Collections from "./Collections.jsx";

vi.mock("../components/RouteMap.jsx", () => ({
  default: () => <div>RouteMap</div>,
}));

describe("Collections", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders calendar header and allows adding a local schedule", () => {
    render(<Collections />);
    expect(screen.getByText(/Schedule Pickup/i)).toBeInTheDocument();
    const dateInput = screen.getAllByRole("textbox").find(() => true);
    const dateEl = screen.getAllByDisplayValue("")[0];
    fireEvent.change(dateEl, { target: { value: "2025-09-03" } });
    const timeInput = screen.getByPlaceholderText("e.g. 9:00 AM");
    fireEvent.change(timeInput, { target: { value: "9:15 AM" } });
    fireEvent.click(screen.getByText("Add Schedule"));
    expect(screen.getByText("Today's Route")).toBeInTheDocument();
  });
});


