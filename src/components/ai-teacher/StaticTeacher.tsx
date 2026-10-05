import Image from "next/image";
import type { AITeacherProps } from "./AITeacher";

export function StaticTeacher({ phase, isSpeaking }: AITeacherProps) {
  return (
    <div
      className="teacher-portrait"
      data-phase={phase}
      data-speaking={isSpeaking ? "true" : "false"}
    >
      <div aria-hidden="true" className="teacher-portrait__halo" />
      <Image
        alt="MarsVidya AI English Teacher"
        className="teacher-portrait__image"
        fill
        priority
        sizes="(max-width: 767px) 92vw, 48vw"
        src="/images/ai-teacher/marsvidya-teacher.webp"
      />
      <div aria-hidden="true" className="teacher-portrait__base" />
    </div>
  );
}
