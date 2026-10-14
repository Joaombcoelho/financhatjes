import { createClient } from "@supabase/supabase-js";
import { transcribe } from "./gateway/transcribe.server";
export async function handleAudio(request: Request): Promise<Response> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const aiKey = process.env["LOVABLE_API_KEY"];
  if (!url || !key || !aiKey)
    return Response.json({ message: "A leitura de áudio não está configurada." }, { status: 503 });
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer "))
    return Response.json({ message: "Entre na sua conta para enviar áudio." }, { status: 401 });
  const client = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: auth },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.getUser(auth.slice(7));
  if (error || !data.user)
    return Response.json({ message: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const max = 10 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max + 65536)
    return Response.json({ message: "O áudio deve ter até 10 MB." }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: "Envie um áudio." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      bytes += value.length;
      if (bytes > max + 65536) {
        await reader.cancel();
        return Response.json({ message: "O áudio deve ter até 10 MB." }, { status: 413 });
      }
      chunks.push(value);
    }
  }
  try {
    const blob = new Blob(chunks as BlobPart[]);
    const form = await new Response(blob, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > max ||
      ![
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/webm",
        "audio/flac",
      ].includes(file.type)
    )
      return Response.json(
        { message: "Envie um áudio WAV, MP3, M4A, FLAC ou WebM válido, até 10 MB." },
        { status: 400 },
      );
    const response = await transcribe(
      {
        apiKey: aiKey,
        baseURL: "https://ai.gateway.lovable.dev",
        model: "openai/gpt-transcribe",
        maxFileBytes: max,
        audioOnly: true,
      },
      file,
      { signal: request.signal },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: { message?: string };
      };
      return Response.json(
        { message: body.message ?? body.error?.message ?? "Não foi possível transcrever o áudio." },
        { status: response.status },
      );
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "text/event-stream",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return new Response(null, { status: 499 });
    return Response.json(
      { message: "Não foi possível ler este áudio. Verifique o arquivo." },
      { status: 400 },
    );
  }
}
