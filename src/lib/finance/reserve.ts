import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, StorageError, type LoadStatus } from "./store";
import type { ReserveGoal, ReserveKind, ReserveMovement } from "./reserve-calc";

/** Reserva de emergência do usuário autenticado (RLS no banco; user_id vem da sessão). */
type State = { movements: ReserveMovement[]; goal: ReserveGoal | null; status: LoadStatus; error: string | null };
let state: State = { movements: [], goal: null, status: "idle", error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const INITIAL = state;

type MovementRow = { id: string; kind: string; amount: number | string; note: string | null; movement_date: string; created_at: string };
const fromRow = (r: MovementRow): ReserveMovement => ({ id: r.id, kind: r.kind === "withdraw" ? "withdraw" : "deposit", amount: Number(r.amount), note: r.note, date: r.movement_date, createdAt: r.created_at });
const COLS = "id, kind, amount, note, movement_date, created_at";

let inflight: Promise<void> | null = null;
export const reserveStore = {
  load(): Promise<void> {
    if (inflight) return inflight;
    set({ status: "loading" });
    inflight = (async () => {
      try {
        const [m, g] = await Promise.all([
          supabase.from("reserve_movements").select(COLS).order("movement_date", { ascending: false }).order("created_at", { ascending: false }),
          supabase.from("reserve_goals").select("mode, target_amount, months").maybeSingle(),
        ]);
        if (m.error || g.error) throw m.error ?? g.error;
        set({
          status: "ready", error: null,
          movements: (m.data as MovementRow[]).map(fromRow),
          goal: g.data ? { mode: g.data.mode === "months" ? "months" : "fixed", targetAmount: g.data.target_amount === null ? null : Number(g.data.target_amount), months: g.data.months } : null,
        });
      } catch (e) {
        set({ status: "error", error: friendlyError(e, "Não foi possível carregar sua reserva.") });
      } finally { inflight = null; }
    })();
    return inflight;
  },
  async add(kind: ReserveKind, amount: number, date: string, note: string) {
    if (!Number.isFinite(amount) || amount <= 0) throw new StorageError("Informe um valor maior que zero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new StorageError("Informe uma data válida.");
    const { data, error } = await supabase.from("reserve_movements")
      .insert({ kind, amount: Math.round(amount * 100) / 100, movement_date: date, note: note.trim().slice(0, 200) || null })
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
  reset() { set(INITIAL); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useReserve(): State {
  const s = useSyncExternalStore(reserveStore.subscribe, () => state, () => INITIAL);
  useEffect(() => { if (state.status === "idle") void reserveStore.load(); }, []);
  return s;
}
