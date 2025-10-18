import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";
import FieldHint from "./FieldHint.jsx";

describe("FieldHint", () => {
  it("renders hint text", () => {
    render(<FieldHint>Helpful hint</FieldHint>);
    expect(screen.getByText("Helpful hint")).toBeInTheDocument();
  });
});
