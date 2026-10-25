"use client";

import { useReducer, useRef } from "react";
import Link from "next/link";
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
  variant?: "practice" | "home";
}

export function TeacherWorkspace({ initialState, variant = "practice" }: TeacherWorkspaceProps) {
  const [state, dispatch] = useReducer(transitionVoiceState, initialState ?? initialVoiceState);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activePlaybackRef = useRef<ActivePlayback>({ player: null, objectUrl: null, source: null });
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
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
      const chatResponse = await fetch("/api/ai/voice-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: transcript }),
      });
      if (!chatResponse.ok) {
        const error = await readJsonResponse<{ error?: string }>(chatResponse, "Your teacher couldn't reply. Please try again.");
        throw new Error(error.error || "Your teacher couldn't reply. Please try again.");
      }
      if (!chatResponse.body) throw new Error("Your teacher's live response was empty. Please try again.");

      let playbackQueue = Promise.resolve();
      let playbackFailure: Error | undefined;
      let audioChunkCount = 0;
      let responseText = "";
      let receivedDone = false;
      for await (const event of readVoiceEvents(chatResponse.body)) {
        if (event.type === "text" && event.text) {
          responseText += event.text;
          dispatch({ type: "RESPONSE_TEXT", text: event.text });
        } else if (event.type === "audio" && event.audio) {
          audioChunkCount += 1;
          dispatch({ type: "SPEECH_STARTED" });
          playbackQueue = playbackQueue.then(() => playAudioChunk(event.audio!, audioContextRef.current, activePlaybackRef.current))
            .catch((error: unknown) => { playbackFailure = error instanceof Error ? error : new Error("Audio playback failed."); });
        } else if (event.type === "error") {
          throw new Error(event.message || "Krishna could not finish speaking. Please try again.");
        } else if (event.type === "done") {
          receivedDone = true;
        }
      }
      await playbackQueue;
      if (!receivedDone || !responseText.trim() || audioChunkCount === 0) {
        throw new Error("The voice response ended before Krishna could speak. Please try again.");
      }
      if (playbackFailure) throw playbackFailure;
      dispatch({ type: "PLAYBACK_ENDED" });
    } catch (error) {
      stopAudioPlayback(activePlaybackRef.current);
      dispatch({ type: "FAILED", error: { code: "provider-failed", message: error instanceof Error ? error.message : "Voice conversation failed. Please try again.", retryable: true } });
    }
  }

  function stopSilenceDetection() {
    if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
    silenceTimerRef.current = null;
    microphoneSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    microphoneSourceRef.current = null;
    analyserRef.current = null;
  }

  function startSilenceDetection(stream: MediaStream, recorder: MediaRecorder) {
    const context = audioContextRef.current;
    if (!context || typeof context.createAnalyser !== "function") return;
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const microphoneSource = context.createMediaStreamSource(stream);
    microphoneSource.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const listeningStartedAt = Date.now();
    let speechDetected = false;
    let quietStartedAt: number | null = null;
    analyserRef.current = analyser;
    microphoneSourceRef.current = microphoneSource;
    silenceTimerRef.current = window.setInterval(() => {
      if (recorder.state !== "recording") return;
      analyser.getByteTimeDomainData(samples);
      const energy = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
      const now = Date.now();
      if (energy > 0.022) {
        speechDetected = true;
        quietStartedAt = null;
      } else if (speechDetected) {
        quietStartedAt ??= now;
        if (now - quietStartedAt >= 1_250) recorder.stop();
      }
      if (now - listeningStartedAt >= 28_000) recorder.stop();
    }, 160);
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
          void audioContextRef.current.resume().catch(() => undefined);
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
        recorder.onstop = () => {
          stopSilenceDetection();
          stream.getTracks().forEach((track) => track.stop());
          void finishRecording(recorder);
        };
        recorderRef.current = recorder;
        dispatch({ type: "START_LISTENING" });
        recorder.start(250);
        startSilenceDetection(stream, recorder);
      } catch (error) {
        const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
        dispatch({ type: "FAILED", error: { code: denied ? "permission-denied" : "unknown", message: denied ? "Microphone permission is blocked. Allow microphone access for this site in your phone's browser settings, then tap Try again." : error instanceof Error ? error.message : "Please allow microphone access to speak with your teacher.", retryable: true } });
      }
    } else if (state.phase === "listening") {
      if (audioContextRef.current) {
        // Mobile browsers can suspend a silent context during the recording and API round trips.
        // Resume it directly from the stop tap so the later response can play without another gesture.
        void audioContextRef.current.resume().catch(() => undefined);
      }
      recorderRef.current?.stop();
    } else if (state.phase === "error") {
      dispatch({ type: "RETRY" });
    }
  }

  if (variant === "home") {
    return <InlineHomeExperience state={state} onVoiceAction={handleVoiceAction} />;
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

const homeCharacterNames = ["Ved Vyasa", "Krishna", "Arjuna", "Shiva"];

function InlineHomeExperience({ state, onVoiceAction }: { state: VoiceState; onVoiceAction: () => void }) {
  const busy = state.phase === "transcribing" || state.phase === "thinking" || state.phase === "speaking";
  const voiceLabel = state.phase === "listening"
    ? "Stop listening"
    : state.phase === "error"
      ? "Try speaking again"
      : busy
        ? "Krishna is preparing a reply"
        : "Start speaking with Krishna";
  const status = state.phase === "idle" ? "Tap the microphone and speak with Krishna"
    : state.phase === "listening" ? "Krishna is listening… pause when you finish"
      : state.phase === "transcribing" ? "Listening closely to your words…"
        : state.phase === "thinking" ? "Krishna is reflecting…"
          : state.phase === "speaking" ? "Krishna is speaking…"
            : state.error?.message ?? "Something went wrong. Please try again.";

  return (
    <main className="home-screen" data-phase={state.phase}>
      <div aria-hidden="true" className="home-screen__shade" />
      <header className="home-header">
        <Link aria-label="MarsVidya home" className="home-brand" href="/home">
          <span className="home-brand__mark">M</span><span>MarsVidya</span>
        </Link>
        <Link aria-label="Sign out and return to sign in" className="home-profile" href="/">
          <ProfileIcon />
        </Link>
      </header>

      <section aria-labelledby="home-title" className="home-copy">
        <p className="home-copy__eyebrow">YOUR STORY STARTS HERE</p>
        <h1 id="home-title">Talk with your favourite characters</h1>
        <p>Explore. Learn. Grow. Anytime.</p>
      </section>

      <aside aria-label="Characters to explore" className="home-characters">
        {homeCharacterNames.map((name, index) => (
          <div className={`home-character home-character--${index + 1}`} key={name}>
            <span aria-hidden="true" className="home-character__portrait" />
            <span className="home-character__name">{name}</span>
          </div>
        ))}
        <span aria-hidden="true" className="home-character home-character--add">+</span>
      </aside>

      {(state.transcript || state.response || state.phase !== "idle") && (
        <section aria-label="Voice conversation" className="home-conversation" aria-live="polite">
          {state.transcript && <p><strong>You:</strong> {state.transcript}</p>}
          {state.response && <p><strong>Krishna:</strong> {state.response}</p>}
          {state.phase === "error" && <p role="status">{state.error?.message}</p>}
        </section>
      )}

      <div className="home-action">
        <p className={`home-voice-status${state.phase === "error" ? " home-voice-status--error" : ""}`} role="status" aria-live="polite">{status}</p>
        <button
          aria-label={voiceLabel}
          className={`home-mic${state.phase === "listening" ? " home-mic--listening" : ""}`}
          disabled={busy}
          onClick={onVoiceAction}
          type="button"
        >
          <SoundIcon />
        </button>
        <span className="home-action__label">{state.phase === "listening" ? "Pause when you finish speaking" : state.phase === "speaking" ? "Listening again soon" : "Speak with Krishna"}</span>
      </div>
    </main>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path d="M4 13v6M9 8v16M14 4v24M19 10v12M24 7v18M29 13v6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

interface ActivePlayback {
  player: HTMLAudioElement | null;
  objectUrl: string | null;
  source: AudioBufferSourceNode | null;
}

function stopAudioPlayback(playback: ActivePlayback) {
  playback.source?.stop();
  playback.source = null;
  playback.player?.pause();
  playback.player = null;
  if (playback.objectUrl) URL.revokeObjectURL(playback.objectUrl);
  playback.objectUrl = null;
}

async function playAudioChunk(audio: string, audioContext: AudioContext | null, activePlayback: ActivePlayback): Promise<void> {
  const binary = atob(audio);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (audioContext) {
    try {
      await audioContext.resume();
      const buffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      activePlayback.source = source;
      await new Promise<void>((resolve) => {
        source.onended = () => {
          if (activePlayback.source === source) activePlayback.source = null;
          resolve();
        };
        source.start();
      });
      return;
    } catch {
      // Fall back to the browser audio element if this device cannot decode streamed WAV segments.
      activePlayback.source = null;
    }
  }

  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  const player = new Audio(url);
  activePlayback.objectUrl = url;
  activePlayback.player = player;
  try {
    await new Promise<void>((resolve, reject) => {
      player.onended = () => resolve();
      player.onerror = () => reject(new Error("Audio playback failed. Check the device volume and try again."));
      void player.play().catch(reject);
    });
  } finally {
    player.pause();
    if (activePlayback.player === player) activePlayback.player = null;
    if (activePlayback.objectUrl === url) {
      URL.revokeObjectURL(url);
      activePlayback.objectUrl = null;
    }
  }
}

async function* readVoiceEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<{ type: string; text?: string; audio?: string; message?: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parseLines = (chunk: string) => chunk.split(/\r?\n/u)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; text?: string; audio?: string; message?: string });

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const groups = buffer.split(/\r?\n\r?\n/u);
      buffer = groups.pop() ?? "";
      for (const group of groups) for (const event of parseLines(group)) yield event;
      if (done) break;
    }
    if (buffer.trim()) for (const event of parseLines(buffer)) yield event;
  } finally {
    reader.releaseLock();
  }
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
