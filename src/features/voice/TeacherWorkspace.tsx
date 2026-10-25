"use client";

import { useReducer, useRef } from "react";
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

export function TeacherWorkspace({ initialState }: TeacherWorkspaceProps) {
  const [state, dispatch] = useReducer(transitionVoiceState, initialState ?? initialVoiceState);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  async function finishRecording(recorder: MediaRecorder) {
    dispatch({ type: "STOP_LISTENING" });
    const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    try {
      const form = new FormData();
      const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
      form.append("file", audio, `practice.${extension}`);
      const sttResponse = await fetch("/api/ai/speech-to-text", { method: "POST", body: form });
      const stt = await sttResponse.json();
      if (!sttResponse.ok) throw new Error(stt.error || "I couldn't understand that. Please try again.");
      dispatch({ type: "TRANSCRIPTION_SUCCEEDED", transcript: stt.transcript });
      const messages = [...historyRef.current.slice(-28), { role: "user" as const, content: stt.transcript }];
      const chatResponse = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
      const chat = await chatResponse.json();
      if (!chatResponse.ok) throw new Error(chat.error || "Your teacher couldn't reply. Please try again.");
      historyRef.current = [...messages, { role: "assistant", content: chat.reply }];
      const ttsResponse = await fetch("/api/ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: chat.reply }) });
      const tts = await ttsResponse.json();
      if (!ttsResponse.ok) throw new Error(tts.error || "Your teacher replied, but voice playback failed.");
      dispatch({ type: "SPEECH_READY", response: chat.reply });
      const binary = atob(tts.audio);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const player = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
      audioRef.current = player;
      player.onended = () => dispatch({ type: "PLAYBACK_ENDED" });
      player.onerror = () => dispatch({ type: "FAILED", error: { code: "playback-failed", message: "Audio playback failed. Tap the microphone to try again.", retryable: true } });
      await player.play();
    } catch (error) {
      dispatch({ type: "FAILED", error: { code: "provider-failed", message: error instanceof Error ? error.message : "Voice conversation failed. Please try again.", retryable: true } });
    }
  }

  async function handleVoiceAction() {
    if (state.phase === "idle") {
      try {
        if (!window.isSecureContext) {
          throw new Error("Microphone access needs a secure connection. Open this site with HTTPS on your phone.");
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("This browser does not support microphone recording.");
        // getUserMedia triggers the browser's native permission prompt from this tap.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
          .find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); void finishRecording(recorder); };
        recorderRef.current = recorder;
        dispatch({ type: "START_LISTENING" });
        recorder.start();
      } catch (error) {
        const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
        dispatch({ type: "FAILED", error: { code: denied ? "permission-denied" : "unknown", message: denied ? "Microphone permission is blocked. Allow microphone access for this site in your phone's browser settings, then tap Try again." : error instanceof Error ? error.message : "Please allow microphone access to speak with your teacher.", retryable: true } });
      }
    } else if (state.phase === "listening") {
      recorderRef.current?.stop();
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
          {state.transcript && <p className="practice-panel__hint"><strong>You:</strong> {state.transcript}</p>}
          {state.response && <p className="practice-panel__hint"><strong>Teacher:</strong> {state.response}</p>}
          {!state.transcript && <p className="practice-panel__hint">Tap the microphone and start talking. Tap again when you finish.</p>}
        </Card>
      </main>
      <footer className="teacher-footer">
        <span>Learn for the Future.</span>
        <span>Private by design</span>
      </footer>
    </div>
  );
}
