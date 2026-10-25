import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherWorkspace } from "./TeacherWorkspace";
import type { VoiceState } from "@/types/voice";

describe("TeacherWorkspace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    Reflect.deleteProperty(window, "isSecureContext");
  });

  it("presents_the_core_teacher_experience_accessibly", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByRole("heading", { name: "MarsVidya" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Krishna, ready to listen and share wisdom" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start speaking with Lord Krishna. Your browser will ask for microphone access." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are");
    expect(screen.queryByRole("link", { name: "Chat Mode" })).not.toBeInTheDocument();
  });

  it("announces_the_current_listening_phase_in_text", () => {
    const listening: VoiceState = {
      phase: "listening",
      transcript: "",
      response: "",
      error: null,
    };

    render(<TeacherWorkspace initialState={listening} />);

    expect(screen.getByRole("status")).toHaveTextContent("Krishna is listening");
    expect(screen.getByRole("button", { name: "Stop listening" })).toBeInTheDocument();
  });

  it("gives_the_waveform_a_reduced_motion_fallback", () => {
    render(<TeacherWorkspace />);

    expect(screen.getByTestId("audio-waveform")).toHaveClass("motion-reduce:animate-none");
  });

  it("sends a recording through STT, chat, and TTS before playing the returned audio", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/ai/speech-to-text") {
        requests.push(new Request(`http://localhost${url}`, init));
        return Response.json({ transcript: "मुझे साहस दीजिए" });
      }
      requests.push(new Request(`http://localhost${url}`, init));
      const events = [
        { type: "text", text: "वत्स, अपने धर्म पर अडिग रहो।" },
        { type: "audio", audio: "UklGRg==" },
        { type: "done" },
      ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
      return new Response(events, { headers: { "Content-Type": "text/event-stream" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tracks = [{ stop: vi.fn() }];
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => tracks }) } });

    class TestRecorder {
      static isTypeSupported() { return true; }
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {}
      stop() {
        this.ondataavailable?.({ data: new Blob(["recording"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", TestRecorder);

    const resume = vi.fn().mockResolvedValue(undefined);
    const decodeAudioData = vi.fn().mockResolvedValue({});
    const start = vi.fn(() => queueMicrotask(() => source.onended?.()));
    const source = { buffer: null as AudioBuffer | null, connect: vi.fn(), onended: null as (() => void) | null, start };
    vi.stubGlobal("AudioContext", class TestAudioContext {
      destination = {};
      resume = resume;
      decodeAudioData = decodeAudioData;
      createBufferSource = vi.fn(() => source);
    });

    render(<TeacherWorkspace variant="home" />);
    expect(screen.getByRole("heading", { name: "Talk with your favourite characters" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start speaking with Krishna" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Krishna is listening"));
    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));

    await waitFor(() => expect(screen.getByText("वत्स, अपने धर्म पर अडिग रहो।")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tap the microphone and speak with Krishna"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe("/");
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/api/ai/speech-to-text",
      "/api/ai/voice-response",
    ]);
    expect(await requests[0].formData()).toHaveProperty("get");
    expect(JSON.parse(await requests[1].text())).toMatchObject({ message: "मुझे साहस दीजिए" });
    expect(resume).toHaveBeenCalledTimes(3);
    expect(decodeAudioData).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
    expect(tracks[0].stop).toHaveBeenCalledOnce();
  });
});
