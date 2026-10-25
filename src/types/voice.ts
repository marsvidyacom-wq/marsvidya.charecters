export type VoicePhase = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error";

export type VoiceErrorCode =
  | "permission-denied"
  | "unsupported-browser"
  | "empty-audio"
  | "upload-failed"
  | "provider-failed"
  | "playback-failed"
  | "unknown";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  retryable: boolean;
}

export interface VoiceState {
  phase: VoicePhase;
  transcript: string;
  response: string;
  error: VoiceError | null;
}

export type VoiceEvent =
  | { type: "START_LISTENING" }
  | { type: "STOP_LISTENING" }
  | { type: "TRANSCRIPTION_SUCCEEDED"; transcript: string }
  | { type: "RESPONSE_TEXT"; text: string }
  | { type: "SPEECH_STARTED" }
  | { type: "SPEECH_READY"; response: string }
  | { type: "PLAYBACK_ENDED" }
  | { type: "FAILED"; error: VoiceError }
  | { type: "CANCEL" }
  | { type: "RETRY" };
