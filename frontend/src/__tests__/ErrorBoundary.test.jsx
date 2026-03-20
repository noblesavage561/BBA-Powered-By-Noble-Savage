/**
 * Smoke tests for the ErrorBoundary component.
 * These tests verify the component renders without crashing.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    // Suppress expected console.error from React's error boundary mechanism.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const Thrower = () => {
      throw new Error("test error");
    };

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    // ErrorBoundary should show some fallback, not the child.
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(screen.getByText(/Systems Re-calibrating/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
