import type { VoicePhase } from "@/types/voice";

const bars = [0, 1, 2, 3, 4, 5, 6];

export interface AudioWaveformProps {
  phase: VoicePhase;
}

export function AudioWaveform({ phase }: AudioWaveformProps) {
  const active = phase === "listening" || phase === "thinking" || phase === "speaking";

  return (
    <div
      aria-hidden="true"
      className="audio-waveform motion-reduce:animate-none"
      data-active={active ? "true" : "false"}
      data-phase={phase}
      data-testid="audio-waveform"
    >
      {bars.map((bar) => (
        <span className="waveform-bar" key={bar} style={{ "--bar-index": bar } as React.CSSProperties} />
      ))}
    </div>
  );
}
