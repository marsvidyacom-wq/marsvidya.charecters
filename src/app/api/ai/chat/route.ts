import { z } from "zod";

const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(30) });
export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please send a valid message." }, { status: 400 });
  try {
    const upstream = await fetch("https://api.sarvam.ai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": key }, body: JSON.stringify({ model: "sarvam-105b-conversations", messages: [{ role: "system", content: "You are a warm, concise English teacher. Answer the learner, gently correct important errors, and invite continued practice. Use simple language." }, ...parsed.data.messages], max_tokens: 500 }) });
    const data = await upstream.json();
    if (!upstream.ok) return Response.json({ error: "Sarvam could not answer right now. Please try again." }, { status: 502 });
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return Response.json({ error: "The teacher returned an empty reply. Please retry." }, { status: 502 });
    return Response.json({ reply });
  } catch { return Response.json({ error: "Could not connect to Sarvam. Please check your connection and retry." }, { status: 502 }); }
}
