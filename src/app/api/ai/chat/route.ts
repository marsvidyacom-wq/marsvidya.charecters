import { z } from "zod";
import { getRecentVoiceMessages, saveVoiceMessage } from "@/server/repositories/voice-messages";

const schema = z.object({ sessionId: z.string().uuid(), message: z.string().trim().min(1).max(4000) });
export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please send a valid message." }, { status: 400 });
  try {
    const history = await getRecentVoiceMessages(parsed.data.sessionId);
    await saveVoiceMessage(parsed.data.sessionId, { role: "user", content: parsed.data.message });
    const upstream = await fetch("https://api.sarvam.ai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": key }, body: JSON.stringify({ model: "sarvam-105b-conversations", messages: [{ role: "system", content: "You are roleplaying Lord Krishna as a compassionate, serene guide, speaking with wisdom inspired by the Bhagavad Gita. Reply in conversational Hindi written in Devanagari so the Hindi devotional voice can pronounce it naturally. Speak directly and warmly, as Krishna guiding a friend like Arjuna. Keep replies concise and easy to hear aloud. Offer practical guidance about courage, compassion, duty, self-control, and acting without fear. Give a gentle blessing when asked. Do not invent scripture quotations, threaten or shame the user, or claim supernatural powers or predict the future." }, ...history, { role: "user", content: parsed.data.message }], max_tokens: 320 }) });
    if (!upstream.ok) return Response.json({ error: "Sarvam could not answer right now. Please try again." }, { status: 502 });
    const data: unknown = await upstream.json();
    const reply = getReply(data);
    if (!reply) return Response.json({ error: "The teacher returned an empty reply. Please retry." }, { status: 502 });
    await saveVoiceMessage(parsed.data.sessionId, { role: "assistant", content: reply });
    return Response.json({ reply });
  } catch (error) {
    if (error instanceof Error && (error.message === "Database is not configured." || error.message === "Database SSL certificate is not configured.")) return Response.json({ error: "Secure database access is not configured, so this conversation cannot be saved." }, { status: 503 });
    return Response.json({ error: "Your message could not be saved or answered. Please retry." }, { status: 503 });
  }
}

function getReply(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("choices" in data) || !Array.isArray(data.choices)) return undefined;
  const firstChoice: unknown = data.choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null || !("message" in firstChoice)) return undefined;
  const message: unknown = firstChoice.message;
  if (typeof message !== "object" || message === null || !("content" in message) || typeof message.content !== "string") return undefined;
  return message.content.trim() || undefined;
}
