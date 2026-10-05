import type { VoicePhase } from "@/types/voice";
import { StaticTeacher } from "./StaticTeacher";

export interface AITeacherProps {
  phase: VoicePhase;
  isSpeaking: boolean;
}

export function AITeacher(props: AITeacherProps) {
  return <StaticTeacher {...props} />;
}
