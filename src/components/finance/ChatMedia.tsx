import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Square, AudioLines } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recordWav } from "@/lib/ai/record-wav";
export type Receipt = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  name: string;
  base64: string;
};
export function ChatMedia({
  disabled,
  onReceipt,
  onAudio,
}: {
  disabled: boolean;
  onReceipt: (file: Receipt) => void;
  onAudio: (file: File) => void;
}) {
  const receiptRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  useEffect(
    () => () => {
      void recorder.current?.stop().catch(() => {});
    },
    [],
  );
  async function toggle() {
    if (starting) return;
    if (recording) {
      const current = recorder.current;
      recorder.current = null;
      setRecording(false);
      if (current) {
        try {
          onAudio(await current.stop());
        } catch {
          toast.error("Grave uma mensagem com voz antes de enviar.");
        }
      }
      return;
    }
    setStarting(true);
    try {
      recorder.current = await recordWav();
      setRecording(true);
    } catch {
      toast.error(
        "Não foi possível acessar o microfone. Autorize o acesso ou envie um arquivo de áudio.",
      );
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Enviar arquivos">
      <input
        ref={receiptRef}
        type="file"
        className="hidden"
        aria-label="Comprovante ou nota fiscal"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 5 * 1024 * 1024 || !file.size) {
            toast.error("Envie um comprovante de até 5 MB.");
            return;
          }
          const mime = file.type;
          if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mime)) {
            toast.error("Envie JPG, PNG, WebP ou PDF.");
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => toast.error("Não foi possível abrir o arquivo.");
          reader.onload = () => {
            const base64 = String(reader.result).split(",")[1];
            if (base64) onReceipt({ mime: mime as Receipt["mime"], name: file.name, base64 });
          };
          reader.readAsDataURL(file);
        }}
      />
      <input
        ref={audioRef}
        type="file"
        className="hidden"
        aria-label="Arquivo de áudio"
        accept="audio/wav,audio/mpeg,audio/mp4,audio/webm,audio/flac"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!file.size || file.size > 10 * 1024 * 1024) {
            toast.error("Envie áudio de até 10 MB.");
            return;
          }
          onAudio(file);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Ler comprovante ou nota fiscal"
        aria-label="Ler comprovante ou nota fiscal"
        disabled={disabled || recording}
        onClick={() => receiptRef.current?.click()}
      >
        <Paperclip />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Enviar arquivo de áudio"
        aria-label="Enviar arquivo de áudio"
        disabled={disabled || recording}
        onClick={() => audioRef.current?.click()}
      >
        <AudioLines />
      </Button>
      <Button
        type="button"
        variant={recording ? "destructive" : "ghost"}
        size="icon"
        title={recording ? "Parar e processar áudio" : "Gravar áudio"}
        aria-label={recording ? "Parar e processar áudio" : "Gravar áudio"}
        disabled={disabled || starting}
        onClick={() => void toggle()}
      >
        {recording ? <Square /> : <Mic />}
      </Button>
      {recording && (
        <span role="status" className="text-sm font-semibold text-expense">
          Gravando…
        </span>
      )}
    </div>
  );
}
