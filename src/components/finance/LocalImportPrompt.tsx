import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { repository } from "@/lib/finance/store";
import { dismissImport, importAlreadyDone, importLocalTransactions, readLocalTransactions } from "@/lib/finance/local-import";
import type { Transaction } from "@/lib/finance/types";

/** Oferece importar transações antigas deste navegador para a conta, sempre com confirmação. */
export function LocalImportPrompt({ userId }: { userId: string }) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [invalid, setInvalid] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (importAlreadyDone(userId)) return;
    const r = readLocalTransactions();
    setItems(r.valid);
    setInvalid(r.invalid);
  }, [userId]);

  if (!items.length) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const { imported } = await importLocalTransactions(userId, items);
      const skipped = items.length - imported;
      toast.success(`${imported} transação(ões) importada(s).${skipped ? ` ${skipped} já estavam na sua conta.` : ""}`);
      setItems([]);
      await repository.load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="import-title" className="mb-6 rounded-xl border-2 border-primary bg-card p-5 shadow-sm">
      <h2 id="import-title" className="flex items-center gap-2 text-lg font-bold"><Upload className="h-5 w-5" aria-hidden="true" /> Transações salvas neste navegador</h2>
      <p className="mt-1">
        Encontramos <strong>{items.length}</strong> transação(ões) válidas salvas localmente{invalid ? ` (${invalid} inválida(s) serão ignoradas)` : ""}. Deseja importá-las para a sua conta?
        Os dados locais não serão apagados.
      </p>
      {error && <p role="alert" className="mt-2 font-semibold text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {!confirming ? (
          <>
            <Button onClick={() => setConfirming(true)}>Importar para minha conta</Button>
            <Button variant="outline" onClick={() => { dismissImport(userId); setItems([]); }}>Agora não</Button>
          </>
        ) : (
          <>
            <Button onClick={run} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? "Importando…" : `Confirmar importação de ${items.length}`}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>Cancelar</Button>
          </>
        )}
      </div>
    </section>
  );
}
