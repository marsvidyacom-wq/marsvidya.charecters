import { Button } from "@/components/ui/Button";
import type { VoicePhase } from "@/types/voice";

function MicrophoneIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect height="11" rx="4" stroke="currentColor" strokeWidth="1.8" width="7" x="8.5" y="2.5" />
      <path
        d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5v4M8.5 21.5h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export interface VoiceButtonProps {
  phase: VoicePhase;
  onClick: () => void;
}

export function VoiceButton({ phase, onClick }: VoiceButtonProps) {
  const isListening = phase === "listening";
  const isError = phase === "error";
  const isBusy = phase === "transcribing" || phase === "thinking" || phase === "speaking";
  const label = isListening
    ? "Stop listening"
    : isError
      ? "Try speaking again"
      : "Start speaking with Lord Krishna. Your browser will ask for microphone access.";

  return (
    <Button
      aria-label={label}
      className={isListening ? "voice-button voice-button--listening" : "voice-button"}
      disabled={isBusy}
      onClick={onClick}
      size="large"
    >
      <span className="voice-button__icon">
        <MicrophoneIcon />
      </span>
      <span>{isListening ? "Listening… tap to stop" : isError ? "Try again" : "Speak"}</span>
    </Button>
  );
}
