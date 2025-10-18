import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Payments from "./Payments.jsx";

describe("Payments", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch");
    window.fetch.mockReset();
    localStorage.clear();
    localStorage.setItem("token", "t");
  });

  afterAll(() => {
    window.fetch.mockRestore();
  });

  it("renders pending requests and payment history", async () => {
    // First call: requests
    window.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "r1",
          item_type: "Electronics",
          created_at: new Date().toISOString(),
          estimated_cost: 25,
          status: "PendingPayment",
        },
      ],
    });
    // Second call: payments
    window.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<Payments />);
    expect(
      await screen.findByText(/Pending Special Requests/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Electronics/)).toBeInTheDocument();
  });
});


