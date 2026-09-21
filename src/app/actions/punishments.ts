"use server";

import { revalidatePath } from "next/cache";
import { addDays, monthOf } from "@/lib/day";
import { assignPunishment, getProfile, todayKey } from "@/lib/engine";
import { requireUser } from "@/lib/supabase/server";
import type { Punishment } from "@/lib/types";

export async function spinFailure(failureId: string) {
  const { supabase, userId } = await requireUser();
  const { data: failure } = await supabase
    .from("failures")
    .select("id, level, status")
    .eq("id", failureId)
    .eq("user_id", userId)
    .single();
  if (!failure || failure.status !== "pendiente") return { error: "Esa ruleta ya se giró." };
  const punishment = await assignPunishment(supabase, userId, failure);
  if (!punishment) return { error: "Esa ruleta ya se giró." };
  // Sin revalidar aquí: la ruleta necesita seguir montada mientras aterriza.
  return { punishment };
}

async function freezesUsedIn(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, month: string) {
  const { data } = await supabase
    .from("freezes")
    .select("day")
    .eq("user_id", userId)
    .gte("day", `${month}-01`)
    .lt("day", addDays(`${month}-28`, 4).slice(0, 7) + "-01");
  return data?.length ?? 0;
}

/** Usa un comodín sobre un día fallado que todavía no tiene castigo. */
export async function forgiveFailure(failureId: string) {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  const { data: failure } = await supabase.from("failures").select("*").eq("id", failureId).eq("user_id", userId).single();
  if (!failure || failure.status !== "pendiente") return { error: "Ese día ya tiene castigo asignado." };
  const used = await freezesUsedIn(supabase, userId, monthOf(failure.day));
  if (used >= profile.freezes_per_month) return { error: "Ya usaste los comodines de ese mes." };

  await supabase.from("freezes").insert({ user_id: userId, day: failure.day });
  await supabase.from("failures").update({ status: "perdonado" }).eq("id", failureId).eq("status", "pendiente");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Comodín preventivo: hoy no cuenta (enfermedad, viaje). */
export async function freezeToday() {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  const today = todayKey(profile);
  const used = await freezesUsedIn(supabase, userId, monthOf(today));
  if (used >= profile.freezes_per_month) return { error: "Ya usaste los comodines de este mes." };
  const { error } = await supabase.from("freezes").insert({ user_id: userId, day: today });
  if (error) return { error: "Hoy ya tiene comodín." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function startPunishment(id: string) {
  const { supabase, userId } = await requireUser();
  const { data: p } = await supabase.from("punishments").select("*").eq("id", id).eq("user_id", userId).single();
  if (!p || p.status !== "asignado") return { error: "Este castigo ya empezó o terminó." };
  const now = new Date();
  const due = new Date(now.getTime() + Number(p.window_hours ?? 4) * 3_600_000);
  await supabase
    .from("punishments")
    .update({ status: "en_curso", started_at: now.toISOString(), due_at: due.toISOString() })
    .eq("id", id)
    .eq("status", "asignado");
  revalidatePath("/", "layout");
  return { ok: true };
}

async function recompute(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], p: Punishment) {
  const { data: logs } = await supabase.from("punishment_logs").select("amount").eq("punishment_id", p.id);
  const progress = (logs ?? []).reduce((acc, l) => acc + Number(l.amount), 0);
  const done = progress >= Number(p.target);
  await supabase
    .from("punishments")
    .update({
      progress,
      status: done ? "cumplido" : "en_curso",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", p.id);
  return { progress, done };
}

export async function logPunishment(id: string, amount: number) {
  const { supabase, userId } = await requireUser();
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return { error: "Cantidad no válida." };
  const { data: p } = await supabase.from("punishments").select("*").eq("id", id).eq("user_id", userId).single();
  if (!p || p.status !== "en_curso") return { error: "Este castigo no está en curso." };
  if (p.due_at && new Date() > new Date(p.due_at)) return { error: "Se acabó el tiempo de este castigo." };

  await supabase.from("punishment_logs").insert({ user_id: userId, punishment_id: id, amount });
  const result = await recompute(supabase, p as Punishment);
  revalidatePath("/", "layout");
  return result;
}

export async function undoLastLog(id: string) {
  const { supabase, userId } = await requireUser();
  const { data: p } = await supabase.from("punishments").select("*").eq("id", id).eq("user_id", userId).single();
  if (!p || (p.status !== "en_curso" && p.status !== "cumplido")) return { error: "No hay nada que deshacer." };
  if (p.due_at && new Date() > new Date(p.due_at)) return { error: "El castigo ya cerró." };
  const { data: last } = await supabase
    .from("punishment_logs")
    .select("id")
    .eq("punishment_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { error: "No hay nada que deshacer." };
  await supabase.from("punishment_logs").delete().eq("id", last.id);
  const result = await recompute(supabase, p as Punishment);
  revalidatePath("/", "layout");
  return result;
}
