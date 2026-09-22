import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPunishment, escalate, pickChallenge } from "./challenges";
import { addDays, dayKey, daysBetween, monthOf } from "./day";
import type { Failure, Profile, Punishment } from "./types";

/**
 * El motor del hábito. No hay cron: cada vez que abres la app (o que un Atajo
 * consulta /api/status) se evalúan los días que ya cerraron, se asignan castigos
 * de fallos ignorados y se escalan los castigos vencidos.
 */

const AUTO_SPIN_AFTER_MS = 24 * 3_600_000;
const MAX_BACKLOG_DAYS = 60;

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("No encontré tu perfil. ¿Corriste la migración de Supabase?");
  return { ...data, cutoff_hour: Number(data.cutoff_hour) } as Profile;
}

export function todayKey(profile: Profile, now = new Date()): string {
  return dayKey(now, profile.timezone, profile.cutoff_hour);
}

export async function syncState(supabase: SupabaseClient, profile: Profile, now = new Date()) {
  await evaluateClosedDays(supabase, profile, now);
  await Promise.all([autoAssignStaleFailures(supabase, profile.id, now), expirePunishments(supabase, profile.id, now)]);
}

async function evaluateClosedDays(supabase: SupabaseClient, profile: Profile, now: Date) {
  const yesterday = addDays(todayKey(profile, now), -1);
  let from = profile.evaluated_through ? addDays(profile.evaluated_through, 1) : profile.start_day;
  if (from > yesterday) return;
  const oldest = addDays(yesterday, -(MAX_BACKLOG_DAYS - 1));
  if (from < oldest) from = oldest;

  const [totals, freezes, failures] = await Promise.all([
    supabase.from("day_totals").select("day, best_words").eq("user_id", profile.id).gte("day", from).lte("day", yesterday),
    supabase.from("freezes").select("day").eq("user_id", profile.id).gte("day", from).lte("day", yesterday),
    supabase
      .from("failures")
      .select("day, status")
      .eq("user_id", profile.id)
      .gte("day", addDays(from, -4))
      .lte("day", yesterday),
  ]);

  const qualified = new Set(
    (totals.data ?? []).filter((t) => t.best_words >= profile.min_words).map((t) => t.day as string),
  );
  const frozen = new Set((freezes.data ?? []).map((f) => f.day as string));
  const existing = new Set((failures.data ?? []).map((f) => f.day as string));
  const failed = new Set((failures.data ?? []).filter((f) => f.status !== "perdonado").map((f) => f.day as string));

  const rows: { user_id: string; day: string; level: number }[] = [];
  for (const day of daysBetween(from, yesterday)) {
    if (qualified.has(day) || frozen.has(day) || existing.has(day)) continue;
    let run = 0;
    for (let prev = addDays(day, -1); run < 3 && failed.has(prev); prev = addDays(prev, -1)) run++;
    rows.push({ user_id: profile.id, day, level: run + 1 });
    failed.add(day);
  }

  if (rows.length) {
    await supabase.from("failures").upsert(rows, { onConflict: "user_id,day", ignoreDuplicates: true });
  }
  await supabase.from("profiles").update({ evaluated_through: yesterday }).eq("id", profile.id);
  profile.evaluated_through = yesterday;
}

/** Gira la ruleta: el servidor decide el castigo y la ruleta solo lo revela. */
export async function assignPunishment(
  supabase: SupabaseClient,
  userId: string,
  failure: Pick<Failure, "id" | "level">,
  now = new Date(),
): Promise<Punishment | null> {
  const claimed = await supabase
    .from("failures")
    .update({ status: "castigo" })
    .eq("id", failure.id)
    .eq("user_id", userId)
    .eq("status", "pendiente")
    .select("id");
  if (!claimed.data?.length) return null;

  const challenge = pickChallenge();
  const { data } = await supabase
    .from("punishments")
    .insert({ user_id: userId, failure_id: failure.id, ...buildPunishment(challenge, failure.level, now) })
    .select("*")
    .single();
  return (data as Punishment) ?? null;
}

async function autoAssignStaleFailures(supabase: SupabaseClient, userId: string, now: Date) {
  const cutoff = new Date(now.getTime() - AUTO_SPIN_AFTER_MS).toISOString();
  const { data } = await supabase
    .from("failures")
    .select("id, level")
    .eq("user_id", userId)
    .eq("status", "pendiente")
    .lt("created_at", cutoff);
  for (const failure of data ?? []) await assignPunishment(supabase, userId, failure, now);
}

export function isExpired(p: Punishment, now: Date): boolean {
  if (p.status === "asignado") return now > new Date(p.start_by);
  if (p.status === "en_curso") return Boolean(p.due_at) && now > new Date(p.due_at!) && p.progress < p.target;
  return false;
}

async function expirePunishments(supabase: SupabaseClient, userId: string, now: Date) {
  const { data } = await supabase
    .from("punishments")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["asignado", "en_curso"]);

  for (const p of (data ?? []) as Punishment[]) {
    if (!isExpired(p, now)) continue;
    const marked = await supabase
      .from("punishments")
      .update({ status: "vencido" })
      .eq("id", p.id)
      .eq("status", p.status)
      .select("id");
    if (!marked.data?.length) continue;
    await supabase
      .from("punishments")
      .insert({ user_id: userId, failure_id: p.failure_id, parent_id: p.id, ...escalate(p, now) });
  }
}

/* Lecturas para la interfaz -------------------------------------------------- */

export type DayCell = {
  day: string;
  state: "cumplido" | "fallado" | "comodin" | "hoy" | "pendiente" | "fuera";
  words: number;
};

export type Overview = {
  today: string;
  todayWords: number;
  todayDone: boolean;
  todayFrozen: boolean;
  streak: number;
  best: number;
  totalDays: number;
  freezesLeft: number;
  cells: DayCell[];
};

export async function getOverview(supabase: SupabaseClient, profile: Profile, now = new Date(), weeks = 18): Promise<Overview> {
  const today = todayKey(profile, now);
  const [totalsRes, freezesRes, failuresRes] = await Promise.all([
    supabase.from("day_totals").select("day, words, best_words").eq("user_id", profile.id).order("day", { ascending: false }),
    supabase.from("freezes").select("day").eq("user_id", profile.id),
    supabase.from("failures").select("day, status").eq("user_id", profile.id).neq("status", "perdonado"),
  ]);

  const words = new Map<string, number>();
  const qualified = new Set<string>();
  for (const t of totalsRes.data ?? []) {
    words.set(t.day, t.words);
    if (t.best_words >= profile.min_words) qualified.add(t.day);
  }
  const frozen = new Set((freezesRes.data ?? []).map((f) => f.day as string));
  const failed = new Set((failuresRes.data ?? []).map((f) => f.day as string));

  // Racha actual: cuenta hacia atrás desde hoy (si ya cumpliste) o desde ayer.
  const todayDone = qualified.has(today);
  let streak = 0;
  for (let d = todayDone ? today : addDays(today, -1); ; d = addDays(d, -1)) {
    if (qualified.has(d)) streak++;
    else if (!frozen.has(d)) break;
    if (d < profile.start_day) break;
  }

  // Mejor racha histórica.
  let best = 0;
  let run = 0;
  const allDays = [...new Set([...qualified, ...frozen])].sort();
  let prev: string | null = null;
  for (const d of allDays) {
    if (prev && addDays(prev, 1) !== d) run = 0;
    if (qualified.has(d)) run++;
    best = Math.max(best, run);
    prev = d;
  }

  // Calendario: semanas completas terminando en la semana de hoy (lunes a domingo).
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(today, -(weeks * 7 - 1) + (6 - weekday));
  const end = addDays(start, weeks * 7 - 1);
  const cells: DayCell[] = daysBetween(start, end).map((day) => {
    const w = words.get(day) ?? 0;
    if (day > today) return { day, state: "fuera", words: 0 };
    if (qualified.has(day)) return { day, state: "cumplido", words: w };
    if (day === today) return { day, state: "hoy", words: w };
    if (frozen.has(day)) return { day, state: "comodin", words: w };
    if (failed.has(day)) return { day, state: "fallado", words: w };
    if (day < profile.start_day) return { day, state: "fuera", words: 0 };
    return { day, state: "pendiente", words: w };
  });

  const month = monthOf(today);
  const usedThisMonth = [...frozen].filter((d) => monthOf(d) === month).length;

  return {
    today,
    todayWords: words.get(today) ?? 0,
    todayDone,
    todayFrozen: frozen.has(today),
    streak,
    best: Math.max(best, streak),
    totalDays: qualified.size,
    freezesLeft: Math.max(0, profile.freezes_per_month - usedThisMonth),
    cells,
  };
}
