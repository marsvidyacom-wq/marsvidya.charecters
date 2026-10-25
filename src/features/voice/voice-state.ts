import type { VoiceEvent, VoiceState } from "@/types/voice";

export const initialVoiceState: VoiceState = Object.freeze({
  phase: "idle",
  transcript: "",
  response: "",
  error: null,
});

export function transitionVoiceState(_state: VoiceState, _event: VoiceEvent): VoiceState {
  const state = _state;
  const event = _event;

  if (event.type === "FAILED") {
    return { ...state, phase: "error", error: event.error };
  }

  if (event.type === "CANCEL" && state.phase !== "idle") {
    return initialVoiceState;
  }

  if (event.type === "RETRY") {
    return state.phase === "error" ? initialVoiceState : state;
  }

  switch (state.phase) {
    case "idle":
      return event.type === "START_LISTENING"
        ? { ...initialVoiceState, phase: "listening" }
        : state;
    case "listening":
      return event.type === "STOP_LISTENING" ? { ...state, phase: "transcribing" } : state;
    case "transcribing":
      if (event.type !== "TRANSCRIPTION_SUCCEEDED") {
        return state;
      }

      if (!event.transcript.trim()) {
        return {
          ...state,
          phase: "error",
          error: {
            code: "empty-audio",
            message: "I couldn't hear anything. Please try speaking again.",
            retryable: true,
          },
        };
      }

      return {
        ...state,
        phase: "thinking",
        transcript: event.transcript.trim(),
        error: null,
      };
    case "thinking":
      if (event.type === "RESPONSE_TEXT") return { ...state, response: state.response + event.text };
      if (event.type === "SPEECH_STARTED") return { ...state, phase: "speaking", error: null };
      return event.type === "SPEECH_READY" ? { ...state, phase: "speaking", response: event.response, error: null } : state;
    case "speaking":
      if (event.type === "RESPONSE_TEXT") return { ...state, response: state.response + event.text };
      return event.type === "PLAYBACK_ENDED" ? { ...state, phase: "idle" } : state;
    case "error":
      return state;
  }
}
