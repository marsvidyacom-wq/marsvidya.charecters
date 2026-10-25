import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherWorkspace } from "./TeacherWorkspace";
import type { VoiceState } from "@/types/voice";

describe("TeacherWorkspace", () => {
  it("presents_the_core_teacher_experience_accessibly", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByRole("heading", { name: "MarsVidya" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Krishna, ready to listen and share wisdom" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start speaking with Lord Krishna. Your browser will ask for microphone access." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are");
    expect(screen.queryByRole("link", { name: "Chat Mode" })).not.toBeInTheDocument();
  });

  it("announces_the_current_listening_phase_in_text", () => {
    const listening: VoiceState = {
      phase: "listening",
      transcript: "",
      response: "",
      error: null,
    };

    render(<TeacherWorkspace initialState={listening} />);

    expect(screen.getByRole("status")).toHaveTextContent("Krishna is listening");
    expect(screen.getByRole("button", { name: "Stop listening" })).toBeInTheDocument();
  });

  it("gives_the_waveform_a_reduced_motion_fallback", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByTestId("audio-waveform")).toHaveClass("motion-reduce:animate-none");
  });
});
