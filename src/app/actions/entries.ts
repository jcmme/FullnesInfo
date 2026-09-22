"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, todayKey } from "@/lib/engine";
import { countWords, parseTimestamp } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export type EntryFormState = { error?: string } | undefined;

export async function createEntry(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);

  const itemId = String(formData.get("itemId") ?? "") || null;
  const mysteryId = String(formData.get("mysteryId") ?? "") || null;
  const kind = String(formData.get("kind") ?? "otro");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const minutesRaw = Number(formData.get("minutes") ?? 0);
  const minutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? Math.min(1440, Math.round(minutesRaw)) : null;
  const finished = formData.get("finished") === "on";

  if (!title) return { error: "Ponle nombre a lo que consumiste." };
  if (!note) return { error: "Escribe tu nota. Es lo que hace que cuente." };

  const day = todayKey(profile);
  const wordCount = countWords(note);

  const { data: before } = await supabase.from("day_totals").select("words").eq("user_id", userId).eq("day", day).maybeSingle();
  const wasDone = (before?.words ?? 0) >= profile.min_words;

  const { error } = await supabase.from("entries").insert({
    user_id: userId,
    day,
    item_id: itemId,
    mystery_id: mysteryId,
    kind,
    title: title.slice(0, 300),
    note,
    word_count: wordCount,
    minutes,
  });
  if (error) return { error: "No se pudo guardar. Revisa tu conexión e intenta otra vez." };

  if (itemId) {
    const progressInput = String(formData.get("progress") ?? "");
    const pagesInput = Number(formData.get("pages") ?? NaN);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const seconds = parseTimestamp(progressInput);
    if (seconds !== null) update.progress_seconds = seconds;
    if (Number.isFinite(pagesInput) && pagesInput >= 0) update.progress_pages = Math.round(pagesInput);
    if (finished) {
      update.status = "terminado";
      update.finished_at = new Date().toISOString();
    } else {
      update.status = "en_curso";
    }
    await supabase.from("items").update(update).eq("id", itemId).eq("user_id", userId);
  }

  if (mysteryId) {
    await supabase.from("mystery_opens").update({ status: "investigada" }).eq("id", mysteryId).eq("user_id", userId);
  }

  revalidatePath("/", "layout");
  const nowDone = !wasDone && wordCount >= profile.min_words;
  redirect(nowDone ? "/?cumplido=1" : "/");
}

export async function deleteEntry(entryId: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("entries").delete().eq("id", entryId).eq("user_id", userId);
  revalidatePath("/", "layout");
}
