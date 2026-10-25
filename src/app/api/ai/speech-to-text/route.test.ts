import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("speech-to-text route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects an empty recording before contacting Sarvam", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const request = new Request("http://localhost/api/ai/speech-to-text", { method: "POST", body: new FormData() });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Please record your message and try again." });
  });

  it("returns JSON when the multipart recording upload is malformed", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const request = new Request("http://localhost/api/ai/speech-to-text", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=broken" },
      body: "not a valid multipart body",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "The recording upload was incomplete. Please try recording again." });
  });

  it("returns a transcript from the Sarvam response", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ transcript: "नमस्ते कृष्ण" }));
    vi.stubGlobal("fetch", fetchMock);
    const form = new FormData();
    form.append("file", new File(["audio"], "practice.webm", { type: "audio/webm" }));

    const response = await POST(new Request("http://localhost/api/ai/speech-to-text", { method: "POST", body: form }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transcript: "नमस्ते कृष्ण" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.sarvam.ai/speech-to-text", expect.objectContaining({ method: "POST" }));
  });

  it("turns provider errors and malformed success payloads into retryable API errors", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const form = new FormData();
    form.append("file", new File(["audio"], "practice.webm", { type: "audio/webm" }));

    for (const [upstream, expectedStatus] of [[new Response("not-json", { status: 429 }), 503], [Response.json({ text: "missing transcript" }), 502]] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
      const response = await POST(new Request("http://localhost/api/ai/speech-to-text", { method: "POST", body: form }));
      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toHaveProperty("error");
    }
  });

  it("explains unsupported audio and unreadable provider responses without returning invalid JSON", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const form = new FormData();
    form.append("file", new File(["audio"], "practice.webm", { type: "audio/webm" }));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unsupported", { status: 422 })));
    const unsupportedResponse = await POST(new Request("http://localhost/api/ai/speech-to-text", { method: "POST", body: form }));
    expect(unsupportedResponse.status).toBe(422);
    expect(await unsupportedResponse.json()).toHaveProperty("error", "The recording format could not be recognized. Please try again using your device microphone.");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));
    const malformedResponse = await POST(new Request("http://localhost/api/ai/speech-to-text", { method: "POST", body: form }));
    expect(malformedResponse.status).toBe(502);
    expect(await malformedResponse.json()).toHaveProperty("error", "Speech recognition returned an unreadable response. Please try again.");
  });
});
