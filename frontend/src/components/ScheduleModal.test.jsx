import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import ScheduleModal from "./ScheduleModal.jsx";

vi.mock("leaflet", async () => {
  const m = await import("./__mocks__/leaflet.js");
  return { default: m, ...m };
});

describe("ScheduleModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates schedule locally when no token", async () => {
    const onAdded = vi.fn();
    render(<ScheduleModal onClose={() => {}} onAdded={onAdded} />);
    // fill date and time
    const inputs = screen.getAllByRole("textbox");
    const dateInput = screen.getByDisplayValue("");
    fireEvent.change(dateInput, { target: { value: "2025-09-03" } });
    const timeInput = inputs.find((i) => i.getAttribute("type") !== "date");
    fireEvent.change(timeInput, { target: { value: "10:15 AM" } });
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
  });
});
