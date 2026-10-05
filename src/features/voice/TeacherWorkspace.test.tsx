import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherWorkspace } from "./TeacherWorkspace";
import type { VoiceState } from "@/types/voice";

describe("TeacherWorkspace", () => {
  it("presents_the_core_teacher_experience_accessibly", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByRole("heading", { name: "MarsVidya" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "MarsVidya AI English Teacher" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start speaking with your AI English teacher" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready to practice");
    expect(screen.getByRole("link", { name: "Chat Mode" })).toHaveAttribute("href", "/chat");
  });

  it("announces_the_current_listening_phase_in_text", () => {
    const listening: VoiceState = {
      phase: "listening",
      transcript: "",
      response: "",
      error: null,
    };

    render(<TeacherWorkspace initialState={listening} />);

    expect(screen.getByRole("status")).toHaveTextContent("I'm listening");
    expect(screen.getByRole("button", { name: "Stop listening" })).toBeInTheDocument();
  });

  it("gives_the_waveform_a_reduced_motion_fallback", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByTestId("audio-waveform")).toHaveClass("motion-reduce:animate-none");
  });
});
