"use client";

import Link from "next/link";
import { useReducer } from "react";
import { AITeacher } from "@/components/ai-teacher/AITeacher";
import { MarsVidyaHeader } from "@/components/navigation/MarsVidyaHeader";
import { Card } from "@/components/ui/Card";
import { AudioWaveform } from "@/components/voice/AudioWaveform";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceStatus } from "@/components/voice/VoiceStatus";
import { initialVoiceState, transitionVoiceState } from "./voice-state";
import type { VoiceState } from "@/types/voice";

export interface TeacherWorkspaceProps {
  initialState?: VoiceState;
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5.5h14v10H9l-4 3v-13Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M8.5 9h7M8.5 12h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function TeacherWorkspace({ initialState }: TeacherWorkspaceProps) {
  const [state, dispatch] = useReducer(transitionVoiceState, initialState ?? initialVoiceState);

  function handleVoiceAction() {
    if (state.phase === "idle") {
      dispatch({ type: "START_LISTENING" });
    } else if (state.phase === "listening") {
      dispatch({ type: "STOP_LISTENING" });
    } else if (state.phase === "error") {
      dispatch({ type: "RETRY" });
    }
  }

  return (
    <div className="teacher-shell">
      <MarsVidyaHeader />
      <main className="teacher-workspace">
        <section aria-labelledby="teacher-greeting" className="teacher-stage">
          <div className="teacher-stage__copy">
            <span className="eyebrow">Your personal speaking space</span>
            <h2 id="teacher-greeting">Hi! I&apos;m your AI English Teacher.</h2>
            <p>Speak naturally. We&apos;ll practise together, one friendly conversation at a time.</p>
          </div>
          <AITeacher isSpeaking={state.phase === "speaking"} phase={state.phase} />
        </section>

        <Card className="practice-panel">
          <div className="practice-panel__status">
            <span aria-hidden="true" className="live-indicator" data-active={state.phase !== "idle"} />
            <VoiceStatus state={state} />
          </div>
          <AudioWaveform phase={state.phase} />
          <VoiceButton onClick={handleVoiceAction} phase={state.phase} />
          <p className="practice-panel__hint">Try saying: “How can I speak English confidently?”</p>
          <div className="mode-divider">
            <span>or</span>
          </div>
          <Link className="chat-mode-link" href="/chat">
            <ChatIcon />
            <span>Chat Mode</span>
            <span aria-hidden="true" className="chat-mode-link__arrow">
              →
            </span>
          </Link>
        </Card>
      </main>
      <footer className="teacher-footer">
        <span>Learn for the Future.</span>
        <span>Private by design</span>
      </footer>
    </div>
  );
}
