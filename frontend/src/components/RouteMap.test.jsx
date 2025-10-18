import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import RouteMap from "./RouteMap.jsx";

vi.mock("leaflet", async () => {
  const m = await import("./__mocks__/leaflet.js");
  return { default: m, ...m };
});

describe("RouteMap", () => {
  function sampleEvents() {
    return [
      {
        id: "a",
        type: "Pickup",
        time: "09:00",
        location: { lat: 6.9, lng: 79.85 },
      },
      {
        id: "b",
        type: "Pickup",
        time: "10:00",
        location: { lat: 6.91, lng: 79.86 },
      },
      {
        id: "c",
        type: "Pickup",
        time: "11:00",
        location: { lat: 6.92, lng: 79.87 },
      },
    ];
  }

  it("renders and allows compute route", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: false });
    render(<RouteMap events={sampleEvents()} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "a" } });
    fireEvent.change(selects[1], { target: { value: "c" } });
    fireEvent.click(screen.getByText("Compute Route"));

    expect(await screen.findByText(/Route:/)).toBeInTheDocument();
    global.fetch.mockRestore();
  });
});
