import { afterEach, describe, expect, it, vi } from "vitest";

const { getRecentVoiceMessages, saveVoiceMessage } = vi.hoisted(() => ({
  getRecentVoiceMessages: vi.fn().mockResolvedValue([]),
  saveVoiceMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/repositories/voice-messages", () => ({ getRecentVoiceMessages, saveVoiceMessage }));

import { POST } from "./route";

const voiceRequest = () => new Request("http://localhost/api/ai/voice-response", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: "123e4567-e89b-12d3-a456-426614174000", message: "मुझे साहस दीजिए" }),
});

describe("streaming voice response route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    getRecentVoiceMessages.mockClear().mockResolvedValue([]);
    saveVoiceMessage.mockClear().mockResolvedValue(undefined);
  });

  it("streams model text and sentence audio progressively, then saves the complete reply", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    const modelEvents = [
      { choices: [{ delta: { content: "वत्स, धैर्य रखो। " } }] },
      { choices: [{ delta: { content: "साहस से आगे बढ़ो।" } }] },
      { choices: [] },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(modelEvents, { headers: { "Content-Type": "text/event-stream" } }))
      .mockResolvedValueOnce(Response.json({ audios: ["UklGRg=="] }))
      .mockResolvedValueOnce(Response.json({ audios: ["UklGRg=="] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(voiceRequest());
    const events = (await response.text()).split("\n\n").filter(Boolean).map((line) => JSON.parse(line.slice(6)));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(events.filter((event) => event.type === "text").map((event) => event.text).join("")).toBe("वत्स, धैर्य रखो। साहस से आगे बढ़ो।");
    expect(events.filter((event) => event.type === "audio")).toHaveLength(2);
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ stream: true });
    expect(saveVoiceMessage).toHaveBeenLastCalledWith("123e4567-e89b-12d3-a456-426614174000", {
      role: "assistant",
      content: "वत्स, धैर्य रखो। साहस से आगे बढ़ो।",
    });
  });

  it("surfaces provider failure before starting the stream", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider unavailable", { status: 503 })));

    const response = await POST(voiceRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toHaveProperty("error");
  });
});
