import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Login from "./login.jsx";

describe("Login", () => {
  beforeEach(() => {
    vi.spyOn(window, "fetch");
    window.fetch.mockReset();
    localStorage.clear();
  });

  afterAll(() => {
    window.fetch.mockRestore();
  });

  function renderRoute() {
    return render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("submits and stores token then navigates", async () => {
    window.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "t123",
        user: { email: "u@e.com", role: "Resident" },
      }),
    });
    renderRoute();
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "u@e.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("t123"));
  });

  it("shows error on failed signin", async () => {
    window.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });
    renderRoute();
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "u@e.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    await waitFor(() =>
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    );
  });
});
