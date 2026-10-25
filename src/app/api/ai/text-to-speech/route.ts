import { z } from "zod";
const schema = z.object({ text: z.string().trim().min(1).max(2500) });
export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Text is required for speech." }, { status: 400 });
  try { const upstream = await fetch("https://api.sarvam.ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": key }, body: JSON.stringify({ text: parsed.data.text, model: "bulbul:v4-flash", language_code: "en-IN" }) }); const data = await upstream.json(); if (!upstream.ok || !data.audios?.[0]) return Response.json({ error: "Voice playback could not be generated." }, { status: 502 }); return Response.json({ audio: data.audios[0] }); }
  catch { return Response.json({ error: "Could not connect to voice generation. Please retry." }, { status: 502 }); }
}
