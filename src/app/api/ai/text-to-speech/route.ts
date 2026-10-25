import { z } from "zod";
const schema = z.object({ text: z.string().trim().min(1).max(2500) });
export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Text is required for speech." }, { status: 400 });
  try {
    const upstream = await fetch("https://api.sarvam.ai/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": key }, body: JSON.stringify({ text: parsed.data.text, model: "bulbul:v4-flash", language_code: "hi-IN", speaker: "shubh_hi_devotional", pace: 0.92, temperature: 0.45, output_audio_codec: "wav" }) });
    if (!upstream.ok) return Response.json({ error: "Krishna's voice could not be generated. Please try again." }, { status: 502 });
    const data: unknown = await upstream.json();
    const audio = typeof data === "object" && data !== null && "audios" in data && Array.isArray(data.audios) && typeof data.audios[0] === "string"
      ? data.audios[0]
      : "";
    if (!audio || !isBase64Audio(audio)) return Response.json({ error: "Krishna's voice could not be generated. Please try again." }, { status: 502 });
    return Response.json({ audio });
  }
  catch { return Response.json({ error: "Could not connect to voice generation. Please retry." }, { status: 502 }); }
}

function isBase64Audio(value: string): boolean {
  return value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}
