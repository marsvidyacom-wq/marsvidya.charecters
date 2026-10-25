export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Please record your message and try again." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Recording is too large. Please try a shorter message." }, { status: 413 });
  const upstreamForm = new FormData(); upstreamForm.append("file", file); upstreamForm.append("model", "saaras:v4"); upstreamForm.append("mode", "transcribe");
  try { const upstream = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: upstreamForm }); const data = await upstream.json(); if (!upstream.ok) return Response.json({ error: "Speech recognition failed. Please try again." }, { status: 502 }); return Response.json({ transcript: data.transcript ?? "" }); }
  catch { return Response.json({ error: "Could not connect to speech recognition. Please retry." }, { status: 502 }); }
}
