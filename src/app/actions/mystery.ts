"use server";

import { revalidatePath } from "next/cache";
import { getProfile, todayKey } from "@/lib/engine";
import { drawTopic, getTopic } from "@/lib/mystery";
import { requireUser } from "@/lib/supabase/server";

export async function openMysteryBox() {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  const today = todayKey(profile);

  const { count } = await supabase
    .from("failures")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pendiente");
  if (count) return { error: "Primero gira la ruleta de tus días fallados." };

  const { data: existing } = await supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("day", today).maybeSingle();
  if (existing) return { open: existing, topic: getTopic(existing.topic_id) ?? null };

  const { data: seenRows } = await supabase.from("mystery_opens").select("topic_id").eq("user_id", userId);
  const topic = drawTopic(new Set((seenRows ?? []).map((r) => r.topic_id)));
  const { data, error } = await supabase
    .from("mystery_opens")
    .insert({ user_id: userId, topic_id: topic.id, rarity: topic.rarity, day: today })
    .select("*")
    .single();
  if (error || !data) {
    // Dos toques seguidos: la caja del día ya se abrió, se devuelve esa misma.
    const { data: justOpened } = await supabase
      .from("mystery_opens")
      .select("*")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    if (justOpened) return { open: justOpened, topic: getTopic(justOpened.topic_id) ?? null };
    return { error: "No se pudo abrir la caja. Intenta otra vez." };
  }
  revalidatePath("/", "layout");
  return { open: data, topic };
}
