import { afterEach, describe, expect, it, vi } from "vitest";

const { getRecentVoiceMessages, saveVoiceMessage } = vi.hoisted(() => ({
  getRecentVoiceMessages: vi.fn().mockResolvedValue([]),
  saveVoiceMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/repositories/voice-messages", () => ({ getRecentVoiceMessages, saveVoiceMessage }));

import { POST } from "./route";

const request = () => new Request("http://localhost/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: "123e4567-e89b-12d3-a456-426614174000", message: "नमस्ते" }),
});

describe("chat route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    getRecentVoiceMessages.mockClear().mockResolvedValue([]);
    saveVoiceMessage.mockClear().mockResolvedValue(undefined);
  });

  it("returns and saves the Sarvam reply", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "वत्स, धैर्य रखो।" } }] })));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: "वत्स, धैर्य रखो।" });
    expect(saveVoiceMessage).toHaveBeenCalledTimes(2);
    expect(saveVoiceMessage).toHaveBeenLastCalledWith("123e4567-e89b-12d3-a456-426614174000", { role: "assistant", content: "वत्स, धैर्य रखो।" });
  });

  it("returns a retryable error when Sarvam fails or sends no reply", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    for (const upstream of [new Response("not-json", { status: 503 }), Response.json({ choices: [] })]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
      const response = await POST(request());
      expect([502, 503]).toContain(response.status);
      expect(await response.json()).toHaveProperty("error");
    }
  });
});
