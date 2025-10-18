import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import ProfileOverlay from "./ProfileOverlay.jsx";

describe("ProfileOverlay", () => {
  it("does not render when user is null", () => {
    const { container } = render(
      <ProfileOverlay user={null} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders user info and closes on background click", () => {
    const user = { email: "u@example.com", name: "User Name", id: 1 };
    const onClose = vi.fn();
    render(<ProfileOverlay user={user} onClose={onClose} />);
    expect(screen.getByText("User Name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
