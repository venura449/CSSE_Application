import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";
import Settings from "./Settings.jsx";

describe("Settings", () => {
  it("renders settings page", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});


