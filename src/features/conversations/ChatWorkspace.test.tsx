import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "./ChatWorkspace";

describe("ChatWorkspace", () => {
  it("rejects_blank_messages", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChatWorkspace onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: "Message your English teacher" }), "   ");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Write a message before sending");
  });

  it("submits_once_with_enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChatWorkspace onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox", { name: "Message your English teacher" });
    await user.type(input, "Help me introduce myself{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("Help me introduce myself");
    expect(input).toHaveValue("");
  });

  it("keeps_shift_enter_as_a_newline", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChatWorkspace onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox", { name: "Message your English teacher" });
    await user.type(input, "First line{Shift>}{Enter}{/Shift}Second line");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue("First line\nSecond line");
  });

  it("disables_duplicate_submission_while_loading", async () => {
    const user = userEvent.setup();
    let finishSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve;
        }),
    );
    render(<ChatWorkspace onSubmit={onSubmit} />);

    await user.type(
      screen.getByRole("textbox", { name: "Message your English teacher" }),
      "Practise an interview",
    );
    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(sendButton).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Sending your message");
    await user.click(sendButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    finishSubmit?.();
    await waitFor(() => expect(sendButton).not.toBeDisabled());
  });

  it("preserves_the_draft_when_submission_fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Development service unavailable"));
    render(<ChatWorkspace onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox", { name: "Message your English teacher" });
    await user.type(input, "Please correct this sentence{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Development service unavailable"),
    );
    expect(input).toHaveValue("Please correct this sentence");
  });
});
