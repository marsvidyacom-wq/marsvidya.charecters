import { StatusMessage } from "@/components/ui/StatusMessage";
import type { VoiceState } from "@/types/voice";

const phaseLabels = {
  idle: "Ready to practice",
  listening: "I'm listening…",
  transcribing: "Turning your speech into words…",
  thinking: "Your teacher is thinking…",
  speaking: "Your teacher is speaking…",
} as const;

export function VoiceStatus({ state }: { state: VoiceState }) {
  if (state.phase === "error") {
    return <StatusMessage tone="error">{state.error?.message ?? "Something went wrong. Please try again."}</StatusMessage>;
  }

  const tone = state.phase === "idle" ? "neutral" : "active";
  return <StatusMessage tone={tone}>{phaseLabels[state.phase]}</StatusMessage>;
}
