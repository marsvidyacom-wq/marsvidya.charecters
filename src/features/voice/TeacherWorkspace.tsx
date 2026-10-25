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
  const audioUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioContextResumeRef = useRef<Promise<void> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  async function finishRecording(recorder: MediaRecorder) {
    dispatch({ type: "STOP_LISTENING" });
    const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    try {
      const form = new FormData();
      const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
      form.append("file", audio, `practice.${extension}`);
      const sttResponse = await fetch("/api/ai/speech-to-text", { method: "POST", body: form });
      const stt = await readJsonResponse<{ transcript?: string; error?: string }>(sttResponse, "Speech recognition returned an invalid response.");
      if (!sttResponse.ok) throw new Error(stt.error || "I couldn't understand that. Please try again.");
      const transcript = stt.transcript?.trim();
      if (!transcript) throw new Error("I couldn't hear clear words. Please try speaking again.");
      dispatch({ type: "TRANSCRIPTION_SUCCEEDED", transcript });
      sessionIdRef.current ??= getOrCreateSessionId();
      const chatResponse = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionIdRef.current, message: transcript }) });
      const chat = await readJsonResponse<{ reply?: string; error?: string }>(chatResponse, "Your teacher returned an invalid response.");
      if (!chatResponse.ok) throw new Error(chat.error || "Your teacher couldn't reply. Please try again.");
      const ttsResponse = await fetch("/api/ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: chat.reply }) });
      const tts = await readJsonResponse<{ audio?: string; error?: string }>(ttsResponse, "Voice generation returned an invalid response.");
      if (!ttsResponse.ok) throw new Error(tts.error || "Your teacher replied, but voice playback failed.");
      if (!chat.reply || !tts.audio) throw new Error("The voice response was incomplete. Please try again.");
      const binary = atob(tts.audio);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const audioContext = audioContextRef.current;
      if (audioContext) {
        try {
          await (audioContextResumeRef.current ?? audioContext.resume());
          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
          dispatch({ type: "SPEECH_READY", response: chat.reply });
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.onended = () => dispatch({ type: "PLAYBACK_ENDED" });
          source.start();
          return;
        } catch {
          // Some mobile browsers cannot decode a provider WAV buffer. Fall back to native audio playback.
        }
      }
      dispatch({ type: "SPEECH_READY", response: chat.reply });
      const player = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
      audioUrlRef.current = player.src;
      audioRef.current = player;
      player.onended = () => {
        releaseAudioElement();
        dispatch({ type: "PLAYBACK_ENDED" });
      };
      player.onerror = () => {
        releaseAudioElement();
        dispatch({ type: "FAILED", error: { code: "playback-failed", message: "Audio playback failed. Tap the microphone to try again.", retryable: true } });
      };
      await player.play();
    } catch (error) {
      releaseAudioElement();
      dispatch({ type: "FAILED", error: { code: "provider-failed", message: error instanceof Error ? error.message : "Voice conversation failed. Please try again.", retryable: true } });
    }
  }

  function releaseAudioElement() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }

  async function handleVoiceAction() {
    if (state.phase === "idle") {
      try {
        if (!window.isSecureContext) {
          throw new Error("Microphone access needs a secure connection. Open this site with HTTPS on your phone.");
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("This browser does not support microphone recording.");
        if (window.AudioContext && !audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          audioContextResumeRef.current = audioContextRef.current.resume().catch(() => undefined);
        }
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
      if (audioContextRef.current) {
        // Mobile browsers can suspend a silent context during the recording and API round trips.
        // Resume it directly from the stop tap so the later response can play without another gesture.
        audioContextResumeRef.current = audioContextRef.current.resume().catch(() => undefined);
      }
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
            <span className="eyebrow">A moment for wisdom</span>
            <h2 id="teacher-greeting">Speak with Lord Krishna.</h2>
            <p>Share what is on your mind and hear calm guidance inspired by the Bhagavad Gita.</p>
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
          {state.response && <p className="practice-panel__hint"><strong>Krishna:</strong> {state.response}</p>}
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

async function readJsonResponse<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error(fallback);
  }
}

function getOrCreateSessionId(): string {
  const key = "marsvidya-voice-session";
  const stored = window.localStorage.getItem(key);
  if (stored) return stored;
  const sessionId = window.crypto.randomUUID();
  window.localStorage.setItem(key, sessionId);
  return sessionId;
}
