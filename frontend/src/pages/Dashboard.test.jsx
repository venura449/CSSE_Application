import { render, screen } from "@testing-library/react";
import React from "react";
import Dashboard from "./Dashboard.jsx";

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
