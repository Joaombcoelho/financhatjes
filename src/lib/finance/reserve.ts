import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, StorageError, type LoadStatus } from "./store";
import type { ReserveGoal, ReserveKind, ReserveMovement } from "./reserve-calc";

/** Reserva de emergência do usuário autenticado (RLS no banco; user_id vem da sessão). */
export type SavingsPot = { id: string; name: string; target_amount: number };
type State = { movements: ReserveMovement[]; pots: SavingsPot[]; goal: ReserveGoal | null; status: LoadStatus; error: string | null };
let state: State = { movements: [], pots: [], goal: null, status: "idle", error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const INITIAL = state;

type MovementRow = { id: string; kind: string; amount: number | string; note: string | null; movement_date: string; created_at: string; pot_id: string | null };
const fromRow = (r: MovementRow): ReserveMovement => ({ id: r.id, kind: r.kind === "withdraw" ? "withdraw" : "deposit", amount: Number(r.amount), note: r.note, date: r.movement_date, createdAt: r.created_at, potId: r.pot_id });
const COLS = "id, kind, amount, note, movement_date, created_at, pot_id";

let inflight: Promise<void> | null = null;
export const reserveStore = {
  load(): Promise<void> {
    if (inflight) return inflight;
    set({ status: "loading" });
    inflight = (async () => {
      try {
        const [m, g, p] = await Promise.all([
          supabase.from("reserve_movements").select(COLS).order("movement_date", { ascending: false }).order("created_at", { ascending: false }),
          supabase.from("reserve_goals").select("mode, target_amount, months").maybeSingle(),
          supabase.from("savings_pots").select("id, name, target_amount").order("created_at"),
        ]);
        if (m.error || g.error || p.error) throw m.error ?? g.error ?? p.error;
        set({
          status: "ready", error: null,
          pots: p.data ?? [],
          movements: (m.data as MovementRow[]).map(fromRow),
          goal: g.data ? { mode: g.data.mode === "months" ? "months" : "fixed", targetAmount: g.data.target_amount === null ? null : Number(g.data.target_amount), months: g.data.months } : null,
        });
      } catch (e) {
        set({ status: "error", error: friendlyError(e, "Não foi possível carregar sua reserva.") });
      } finally { inflight = null; }
    })();
    return inflight;
  },
  async add(kind: ReserveKind, amount: number, date: string, note: string, potId: string | null = null) {
    if (!Number.isFinite(amount) || amount <= 0) throw new StorageError("Informe um valor maior que zero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new StorageError("Informe uma data válida.");
    const { data, error } = await supabase.from("reserve_movements")
      .insert({ kind, amount: Math.round(amount * 100) / 100, movement_date: date, note: note.trim().slice(0, 200) || null, pot_id: potId })
      .select(COLS).single();
    if (error || !data) throw new StorageError(friendlyError(error, "Não foi possível salvar a movimentação."));
    set({ movements: [fromRow(data as MovementRow), ...state.movements] });
  },
  async remove(id: string) {
    const { error } = await supabase.from("reserve_movements").delete().eq("id", id);
    if (error) throw new StorageError(friendlyError(error, "Não foi possível excluir a movimentação."));
    set({ movements: state.movements.filter((m) => m.id !== id) });
  },
  async saveGoal(goal: ReserveGoal) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new StorageError("Sua sessão expirou. Entre novamente para continuar.");
    const row = { user_id: u.user.id, mode: goal.mode, target_amount: goal.mode === "fixed" ? goal.targetAmount : null, months: goal.mode === "months" ? goal.months : null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("reserve_goals").upsert(row, { onConflict: "user_id" });
    if (error) throw new StorageError(friendlyError(error, "Não foi possível salvar a meta."));
    set({ goal });
  },
  async savePot(name: string, target: number, id?: string) {
    if (!name.trim() || !Number.isFinite(target) || target <= 0) throw new StorageError("Informe um nome e uma meta maior que zero.");
    const row = { name: name.trim().slice(0, 80), target_amount: target };
    const result = id ? await supabase.from("savings_pots").update(row).eq("id", id) : await supabase.from("savings_pots").insert(row);
    if (result.error) throw new StorageError(friendlyError(result.error, "Não foi possível salvar o cofrinho."));
    await this.load();
  },
  async removePot(id: string) {
    if (state.movements.some(m => m.potId === id)) throw new StorageError("Exclua as movimentações deste cofrinho antes de removê-lo.");
    const { error } = await supabase.from("savings_pots").delete().eq("id", id);
    if (error) throw new StorageError("Não foi possível remover o cofrinho.");
    await this.load();
  },
  reset() { set(INITIAL); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useReserve(): State {
  const s = useSyncExternalStore(reserveStore.subscribe, () => state, () => INITIAL);
  useEffect(() => { if (state.status === "idle") void reserveStore.load(); }, []);
  return s;
}
