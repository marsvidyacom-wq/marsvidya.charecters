export async function POST(request: Request) {
  const key = process.env.SARVAM_API;
  if (!key) return Response.json({ error: "Sarvam API key is not configured on the server." }, { status: 503 });
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "The recording upload was incomplete. Please try recording again." }, { status: 400 });
    }

    const file = form.get("file");
    if (!isUploadFile(file) || file.size === 0) return Response.json({ error: "Please record your message and try again." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Recording is too large. Please try a shorter message." }, { status: 413 });

    const upstreamForm = new FormData();
    const upload = new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" });
    upstreamForm.append("file", upload, file.name || `recording.${extensionFor(file.type)}`);
    upstreamForm.append("model", "saaras:v4");
    upstreamForm.append("mode", "transcribe");
    const upstream = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: upstreamForm });
    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 401 || status === 403) return Response.json({ error: "Speech recognition is not configured correctly. Please contact support." }, { status: 502 });
      if (status === 429) return Response.json({ error: "Speech recognition is busy. Please wait a moment and try again." }, { status: 503 });
      if (status === 422) return Response.json({ error: "The recording format could not be recognized. Please try again using your device microphone." }, { status: 422 });
      return Response.json({ error: "Speech recognition failed. Please try again." }, { status: 502 });
    }
    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      return Response.json({ error: "Speech recognition returned an unreadable response. Please try again." }, { status: 502 });
    }
    const transcript = typeof data === "object" && data !== null && "transcript" in data && typeof data.transcript === "string"
      ? data.transcript.trim()
      : "";
    if (!transcript) return Response.json({ error: "I couldn't hear clear words. Please try speaking again." }, { status: 502 });
    return Response.json({ transcript });
  } catch {
    return Response.json({ error: "Could not connect to speech recognition. Please retry." }, { status: 502 });
  }
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" &&
    typeof value.arrayBuffer === "function" && typeof value.size === "number" && typeof value.name === "string";
}
