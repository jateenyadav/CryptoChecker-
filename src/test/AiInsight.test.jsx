import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiInsight from "../components/AiInsight.jsx";

describe("<AiInsight />", () => {
  it("shows the hint before generating and renders content after clicking", async () => {
    const trigger = vi.fn().mockResolvedValue({
      content: "Bitcoin is up 2% over 24h.",
      model: "rule-based-fallback",
      cached: false,
    });

    render(<AiInsight title="AI Insight" cta="Generate" trigger={trigger} />);

    // Idle hint present, no content yet.
    expect(screen.getByText(/plain-language, AI-generated summary/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() =>
      expect(screen.getByText(/Bitcoin is up 2% over 24h\./i)).toBeInTheDocument()
    );
    expect(trigger).toHaveBeenCalledOnce();
    expect(screen.getByText(/rule-based-fallback/i)).toBeInTheDocument();
  });

  it("surfaces an error when the trigger rejects", async () => {
    const trigger = vi.fn().mockRejectedValue(new Error("Boom"));
    render(<AiInsight trigger={trigger} />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Boom"));
  });
});
