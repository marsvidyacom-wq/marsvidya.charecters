import { describe, expect, it } from "vitest";
import { initialVoiceState, transitionVoiceState } from "./voice-state";
import type { VoiceError, VoiceEvent, VoicePhase, VoiceState } from "@/types/voice";

function apply(state: VoiceState, event: VoiceEvent): VoiceState {
  return transitionVoiceState(state, event);
}

describe("voice state transitions", () => {
  it("follows_the_complete_happy_sequence", () => {
    const phases: VoicePhase[] = [initialVoiceState.phase];
    let state = apply(initialVoiceState, { type: "START_LISTENING" });
    phases.push(state.phase);
    state = apply(state, { type: "STOP_LISTENING" });
    phases.push(state.phase);
    state = apply(state, { type: "TRANSCRIPTION_SUCCEEDED", transcript: "How can I improve?" });
    phases.push(state.phase);
    state = apply(state, { type: "SPEECH_READY", response: "Practice a little every day." });
    phases.push(state.phase);
    state = apply(state, { type: "PLAYBACK_ENDED" });
    phases.push(state.phase);

    expect(phases).toEqual(["idle", "listening", "transcribing", "thinking", "speaking", "idle"]);
    expect(state.transcript).toBe("How can I improve?");
    expect(state.response).toBe("Practice a little every day.");
  });

  it.each(["listening", "transcribing", "thinking", "speaking"] as const)(
    "cancels_%s_back_to_idle",
    (phase) => {
      const state: VoiceState = {
        phase,
        transcript: "draft",
        response: "draft response",
        error: null,
      };

      expect(apply(state, { type: "CANCEL" })).toEqual(initialVoiceState);
    },
  );

  it("retries_an_error_only_by_returning_to_idle", () => {
    const error: VoiceError = {
      code: "provider-failed",
      message: "The AI teacher is temporarily unavailable.",
      retryable: true,
    };
    const failed = apply(initialVoiceState, { type: "FAILED", error });

    expect(failed).toEqual({ ...initialVoiceState, phase: "error", error });
    expect(apply(failed, { type: "RETRY" })).toEqual(initialVoiceState);
  });

  it("ignores_a_duplicate_microphone_click_while_listening", () => {
    const listening = apply(initialVoiceState, { type: "START_LISTENING" });

    expect(apply(listening, { type: "START_LISTENING" })).toBe(listening);
  });

  it("ignores_events_that_are_illegal_for_the_current_phase", () => {
    const event: VoiceEvent = { type: "PLAYBACK_ENDED" };

    expect(apply(initialVoiceState, event)).toBe(initialVoiceState);
  });

  it("rejects_an_empty_transcript_as_an_empty_audio_error", () => {
    const transcribing = apply(apply(initialVoiceState, { type: "START_LISTENING" }), {
      type: "STOP_LISTENING",
    });

    expect(apply(transcribing, { type: "TRANSCRIPTION_SUCCEEDED", transcript: "   " })).toMatchObject({
      phase: "error",
      error: { code: "empty-audio", retryable: true },
    });
  });
});
