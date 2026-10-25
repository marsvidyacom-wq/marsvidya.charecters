import { StatusMessage } from "@/components/ui/StatusMessage";
import type { VoiceState } from "@/types/voice";

const phaseLabels = {
  idle: "Ready when you are",
  listening: "Krishna is listening…",
  transcribing: "Listening closely to your words…",
  thinking: "Krishna is reflecting…",
  speaking: "Krishna is speaking…",
} as const;

export function VoiceStatus({ state }: { state: VoiceState }) {
  if (state.phase === "error") {
    return <StatusMessage tone="error">{state.error?.message ?? "Something went wrong. Please try again."}</StatusMessage>;
  }

  const tone = state.phase === "idle" ? "neutral" : "active";
  return <StatusMessage tone={tone}>{phaseLabels[state.phase]}</StatusMessage>;
}
