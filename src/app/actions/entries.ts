"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, todayKey } from "@/lib/engine";
import { countWords, parseTimestamp } from "@/lib/format";
import { getTopic } from "@/lib/mystery";
import { materialOf, reviewNote } from "@/lib/review";
import { requireUser } from "@/lib/supabase/server";
import { getPack } from "@/lib/topics";
import type { Chapter } from "@/lib/types";

export type EntryFormState = { error?: string } | undefined;

/** Límites del avance: 30 días de reproducción y 100,000 páginas. */
const MAX_SECONDS = 60 * 60 * 24 * 30;
const MAX_PAGES = 100_000;

/**
 * Guarda la nota del día. Con `entryId` continúa una nota de hoy (reemplaza su texto
 * por el nuevo, que ya incluye lo anterior); sin él crea una. Las palabras de todas
 * las notas del día suman para cumplirlo.
 */
export async function saveEntry(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);

  const entryId = String(formData.get("entryId") ?? "") || null;
  const itemId = String(formData.get("itemId") ?? "") || null;
  const mysteryId = String(formData.get("mysteryId") ?? "") || null;
  const topicKey = String(formData.get("topicKey") ?? "") || null;
  const kind = String(formData.get("kind") ?? "otro");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const minutesRaw = Number(formData.get("minutes") ?? 0);
  const minutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? Math.min(1440, Math.round(minutesRaw)) : null;
  const finished = formData.get("finished") === "on";

  if (!title) return { error: "Escribe sobre qué es tu nota." };
  if (!note) return { error: "Escribe tu nota. Es lo que hace que cuente." };

  const day = todayKey(profile);
  const wordCount = countWords(note);

  // Todo lo que hace falta, en una sola vuelta al servidor: las notas de hoy (que ya
  // traen el total del día y la nota que estás continuando) y el material contra el
  // que se revisa. Esto es lo que mantiene el guardado tan rápido como antes.
  const [todayRes, itemRes, mysteryRes] = await Promise.all([
    supabase.from("entries").select("id, note, word_count, minutes, counts, review").eq("user_id", userId).eq("day", day),
    itemId
      ? supabase.from("items").select("title, media_title, media_author, chapters").eq("id", itemId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    mysteryId
      ? supabase.from("mystery_opens").select("topic_id").eq("id", mysteryId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const todays = todayRes.data ?? [];
  const existing = entryId ? todays.find((e) => e.id === entryId) : undefined;
  // La nota se abrió ayer y el día ya cerró: no se duplica su texto como nota nueva.
  if (entryId && !existing) return { error: "Esa nota ya cerró con el día anterior. Empieza una nota nueva para hoy." };
  const wordsBefore = todays.reduce((sum, e) => sum + (e.counts ? e.word_count : 0), 0);

  const item = itemRes.data as { title: string; media_title: string | null; media_author: string | null; chapters: Chapter[] } | null;
  const boxTopic = mysteryRes.data ? getTopic(mysteryRes.data.topic_id) : undefined;
  const pack = topicKey ? getPack(topicKey) : undefined;
  const material = materialOf({
    title: item?.media_title ?? item?.title ?? pack?.title ?? title,
    author: item?.media_author,
    chapters: item?.chapters,
    topic: boxTopic
      ? { title: boxTopic.title, hook: boxTopic.hook, why: boxTopic.why, questions: boxTopic.questions }
      : pack
        ? { title: pack.title, hook: pack.summary, why: pack.why, questions: pack.questions, terms: pack.terms.map((t) => t.term) }
        : null,
  });
  const review = reviewNote({
    note,
    material,
    sameDayNotes: todays.filter((e) => e.id !== entryId).map((e) => e.note),
  });
  // Si ya habías dicho "sí la escribí yo", esa nota no se vuelve a marcar.
  const appealed = Boolean((existing?.review as { appealedAt?: string } | null)?.appealedAt);
  const counts = appealed || review.verdict !== "basura";

  const { error } = existing
    ? await supabase
        .from("entries")
        .update({ title: title.slice(0, 300), note, word_count: wordCount, minutes: minutes ?? existing.minutes, review, counts })
        .eq("id", existing.id)
        .eq("user_id", userId)
    : await supabase.from("entries").insert({
        user_id: userId,
        day,
        item_id: itemId,
        mystery_id: mysteryId,
        topic_key: topicKey,
        kind,
        title: title.slice(0, 300),
        note,
        word_count: wordCount,
        minutes,
        review,
        counts,
      });
  if (error) return { error: "No se pudo guardar. Revisa tu conexión e intenta otra vez." };

  if (itemId) {
    const progressInput = String(formData.get("progress") ?? "");
    const pagesInput = Number(formData.get("pages") ?? NaN);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const seconds = parseTimestamp(progressInput);
    if (seconds !== null && Number.isFinite(seconds)) update.progress_seconds = Math.min(MAX_SECONDS, Math.max(0, Math.round(seconds)));
    if (Number.isFinite(pagesInput) && pagesInput >= 0) update.progress_pages = Math.min(MAX_PAGES, Math.round(pagesInput));
    if (finished) {
      update.status = "terminado";
      update.finished_at = new Date().toISOString();
    }
    // La nota ya se guardó: si el avance falla, se sigue sin romper el guardado.
    const { error: itemError } = await supabase.from("items").update(update).eq("id", itemId).eq("user_id", userId);
    // Escribir sobre algo pendiente lo pone en curso; uno ya terminado se queda terminado.
    if (!finished && !itemError) {
      await supabase.from("items").update({ status: "en_curso" }).eq("id", itemId).eq("user_id", userId).eq("status", "pendiente");
    }
  }

  if (mysteryId) {
    await supabase.from("mystery_opens").update({ status: "investigada" }).eq("id", mysteryId).eq("user_id", userId);
  }

  revalidatePath("/", "layout");
  const wordsAfter = wordsBefore - (existing?.counts ? existing.word_count : 0) + (counts ? wordCount : 0);
  const nowDone = wordsBefore < profile.min_words && wordsAfter >= profile.min_words;
  redirect(nowDone ? "/?cumplido=1" : "/");
}

export async function deleteEntry(entryId: string) {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  // Solo se borran notas de hoy: un día que ya cerró no cambia.
  await supabase.from("entries").delete().eq("id", entryId).eq("user_id", userId).eq("day", todayKey(profile));
  revalidatePath("/", "layout");
}
