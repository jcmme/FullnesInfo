"use server";

import { revalidatePath } from "next/cache";
import { detectOrigin, extractYouTubeId, getYouTubeVideos } from "@/lib/media";
import { requireUser } from "@/lib/supabase/server";
import { customKey } from "@/lib/topics";
import type { ItemKind } from "@/lib/types";

export type InterestInput = { key: string; label: string; area: string };

const MAX_INTERESTS = 60;

/**
 * Guarda tus temas de un jalón: se borran los que quitaste y se agregan los nuevos,
 * conservando el orden en que aparecen. Se llama una sola vez al terminar de elegir,
 * no en cada toque.
 */
export async function saveInterests(chosen: InterestInput[]) {
  const { supabase, userId } = await requireUser();

  const clean: InterestInput[] = [];
  const seen = new Set<string>();
  for (const raw of chosen.slice(0, MAX_INTERESTS)) {
    const label = String(raw.label ?? "").trim().slice(0, 120);
    if (!label) continue;
    const key = String(raw.key ?? "").trim() || customKey(label);
    if (!key || key === "propio:" || seen.has(key)) continue;
    seen.add(key);
    clean.push({ key, label, area: String(raw.area ?? "propio").slice(0, 40) });
  }

  const { data: current, error: readError } = await supabase.from("interests").select("key").eq("user_id", userId);
  if (readError) return { error: "No se pudieron leer tus temas. Intenta otra vez." };

  const currentKeys = new Set((current ?? []).map((r) => r.key as string));
  const removed = [...currentKeys].filter((k) => !seen.has(k));

  if (removed.length) {
    const { error } = await supabase.from("interests").delete().eq("user_id", userId).in("key", removed);
    if (error) return { error: "No se pudieron quitar algunos temas." };
  }

  const rows = clean.map((c, i) => ({ user_id: userId, key: c.key, label: c.label, area: c.area, position: i }));
  if (rows.length) {
    const { error } = await supabase.from("interests").upsert(rows, { onConflict: "user_id,key" });
    if (error) return { error: "No se pudieron guardar tus temas." };
  }

  revalidatePath("/", "layout");
  return { ok: true, count: rows.length };
}

/**
 * Guarda una recomendación de la ficha en tu biblioteca sin sacarte de la pantalla.
 * Si es un video de YouTube se traen título, miniatura, duración y capítulos (1 unidad
 * de cuota) para que llegue completo y no en "por vincular".
 */
export async function saveLink(input: { title: string; url: string; kind: ItemKind; note?: string }) {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim().slice(0, 300);
  const url = input.url.trim();
  if (!title || !url) return { error: "Esa recomendación está incompleta." };

  const videoId = extractYouTubeId(url);
  let media: Awaited<ReturnType<typeof getYouTubeVideos>>[number] | undefined;
  if (videoId) {
    try {
      [media] = await getYouTubeVideos([videoId]);
    } catch {
      // Sin cuota o sin internet: se guarda igual, solo que sin los datos del video.
    }
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    title,
    kind: media ? "video" : input.kind,
    origin: detectOrigin(url),
    origin_url: url,
    note: input.note ?? null,
    // Un libro sin vincular te deja elegir la edición; lo demás ya queda listo para verse.
    status: !media && input.kind === "libro" ? "por_vincular" : "pendiente",
  };
  if (media) {
    Object.assign(row, {
      media_provider: media.result.provider,
      media_id: media.result.id,
      media_title: media.result.title,
      media_author: media.result.author,
      media_url: media.result.url,
      thumbnail_url: media.result.thumbnail,
      duration_seconds: media.result.durationSeconds,
      total_pages: media.result.totalPages,
      chapters: media.chapters,
    });
  } else if (input.kind !== "libro") {
    Object.assign(row, { media_provider: "manual", media_url: url });
  }

  const { data, error } = await supabase.from("items").insert(row).select("id").single();
  if (error || !data) return { error: "No se pudo guardar. Intenta otra vez." };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

/** Marca que ya leíste la ficha de un tema. */
export async function markTopicRead(key: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("interests").update({ read_at: new Date().toISOString() }).eq("user_id", userId).eq("key", key);
}

/**
 * "Sí la escribí yo": devuelve al día una nota que la revisión había marcado como
 * relleno. Queda registrado en la revisión que la apelaste.
 */
export async function appealEntry(entryId: string) {
  const { supabase, userId } = await requireUser();
  const { data: entry } = await supabase
    .from("entries")
    .select("id, review, counts")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) return { error: "Esa nota ya no existe." };
  if (entry.counts) return { ok: true };

  const review = { ...(entry.review as Record<string, unknown> | null), appealedAt: new Date().toISOString() };
  const { error } = await supabase
    .from("entries")
    .update({ counts: true, review })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) return { error: "No se pudo. Intenta otra vez." };

  revalidatePath("/", "layout");
  return { ok: true };
}
