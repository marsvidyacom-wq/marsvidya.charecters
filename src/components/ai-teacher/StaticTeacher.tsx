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
        alt="Krishna, ready to listen and share wisdom"
        className="teacher-portrait__image"
        fill
        priority
        sizes="(max-width: 767px) 92vw, 48vw"
        src="/images/login/krishna-flute-at-sunset.png"
      />
      <div aria-hidden="true" className="teacher-portrait__base" />
    </div>
  );
}
