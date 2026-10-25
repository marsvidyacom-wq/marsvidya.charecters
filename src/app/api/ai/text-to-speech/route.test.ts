import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("text-to-speech route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the audio payload expected by the browser player", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ audios: ["UklGRg=="] })));

    const response = await POST(new Request("http://localhost/api/ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "नमस्ते" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ audio: "UklGRg==" });
  });

  it("rejects malformed provider responses instead of returning invalid audio", async () => {
    vi.stubEnv("SARVAM_API", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ audios: [] })));

    const response = await POST(new Request("http://localhost/api/ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "नमस्ते" }),
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toHaveProperty("error");
  });
});
