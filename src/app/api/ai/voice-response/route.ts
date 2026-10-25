import { z } from "zod";
import { getRecentVoiceMessages, saveVoiceMessage } from "@/server/repositories/voice-messages";

const schema = z.object({ sessionId: z.string().uuid(), message: z.string().trim().min(1).max(4000) });
const systemPrompt = "You are roleplaying Lord Krishna as a compassionate, serene guide, speaking with wisdom inspired by the Bhagavad Gita. Reply in conversational Hindi written in Devanagari so the Hindi devotional voice can pronounce it naturally. Speak directly and warmly, as Krishna guiding a friend like Arjuna. Keep replies concise and easy to hear aloud. Offer practical guidance about courage, compassion, duty, self-control, and acting without fear. Give a gentle blessing when asked. Do not invent scripture quotations, threaten or shame the user, or claim supernatural powers or predict the future.";

export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please send a valid message." }, { status: 400 });

  let upstream: Response;
  try {
    const history = await getRecentVoiceMessages(parsed.data.sessionId);
    await saveVoiceMessage(parsed.data.sessionId, { role: "user", content: parsed.data.message });
    upstream = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": key },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: parsed.data.message }],
        max_tokens: 240,
        stream: true,
      }),
    });
  } catch {
    return Response.json({ error: "Your message could not reach Krishna. Please try again." }, { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Sarvam could not answer right now. Please try again." }, { status: 502 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void streamVoiceReply(upstream, key, parsed.data.sessionId, controller);
    },
    cancel() {
      void upstream.body?.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function streamVoiceReply(upstream: Response, key: string, sessionId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body!.getReader();
  let sourceBuffer = "";
  let sentenceBuffer = "";
  let fullReply = "";
  let closed = false;

  const send = (event: Record<string, string>) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  const speakSentences = async (flush = false) => {
    while (sentenceBuffer) {
      const boundary = sentenceBuffer.search(/[.!?।]/u);
      if (boundary < 0 && !flush) return;
      let end = boundary >= 0 ? boundary + 1 : sentenceBuffer.length;
      if (boundary >= 0) {
        while (end < sentenceBuffer.length && ["\"", "'", "”", "’", ")", "}", "]"].includes(sentenceBuffer[end])) end += 1;
      }
      if (boundary < 0 && sentenceBuffer.length < 150 && !flush) return;
      const sentence = sentenceBuffer.slice(0, end).trim();
      sentenceBuffer = sentenceBuffer.slice(end).trimStart();
      if (!sentence) continue;
      const audio = await synthesizeSentence(key, sentence);
      send({ type: "audio", audio });
    }
  };

  const handleLine = async (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    const parsed: unknown = JSON.parse(payload);
    const delta = getContentDelta(parsed);
    if (!delta) return;
    fullReply += delta;
    sentenceBuffer += delta;
    send({ type: "text", text: delta });
    await speakSentences();
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sourceBuffer += decoder.decode(value, { stream: true });
      const lines = sourceBuffer.split(/\r?\n/u);
      sourceBuffer = lines.pop() ?? "";
      for (const line of lines) await handleLine(line);
    }
    sourceBuffer += decoder.decode();
    if (sourceBuffer.trim()) await handleLine(sourceBuffer.trim());
    await speakSentences(true);
    if (!fullReply.trim()) throw new Error("The teacher returned an empty reply.");
    await saveVoiceMessage(sessionId, { role: "assistant", content: fullReply.trim() });
    send({ type: "done" });
    closed = true;
    controller.close();
  } catch {
    try {
      send({ type: "error", message: "Krishna could not finish speaking. Please try again." });
      closed = true;
      controller.close();
    } catch {
      closed = true;
    }
  } finally {
    if (!closed) controller.close();
    reader.releaseLock();
  }
}

function getContentDelta(value: unknown): string {
  if (typeof value !== "object" || value === null || !("choices" in value) || !Array.isArray(value.choices)) return "";
  const choice: unknown = value.choices[0];
  if (typeof choice !== "object" || choice === null || !("delta" in choice)) return "";
  const delta: unknown = choice.delta;
  if (typeof delta !== "object" || delta === null || !("content" in delta)) return "";
  return typeof delta.content === "string" ? delta.content : "";
}

async function synthesizeSentence(key: string, text: string): Promise<string> {
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": key },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model: "bulbul:v4-flash",
      language_code: "hi-IN",
      speaker: "shubh_hi_devotional",
      pace: 0.92,
      temperature: 0.45,
      output_audio_codec: "wav",
    }),
  });
  if (!response.ok) throw new Error("Text to speech failed.");
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("audios" in data) || !Array.isArray(data.audios)) throw new Error("Text to speech returned an invalid response.");
  const audio = data.audios[0];
  if (typeof audio !== "string" || !isBase64Audio(audio)) throw new Error("Text to speech returned invalid audio.");
  return audio;
}

function isBase64Audio(value: string): boolean {
  return value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value);
}
