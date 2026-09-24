"use server";

import { revalidatePath } from "next/cache";
import { detectOrigin, extractYouTubeId, getYouTubeVideos } from "@/lib/media";
import { requireUser } from "@/lib/supabase/server";
import { AREA_LIST } from "@/lib/areas";
import type { ItemKind } from "@/lib/types";

export type InterestInput = { key: string; label: string; area: string };

/** Tus áreas: lo único que eliges. Se guardan de un jalón al terminar. */
export async function saveAreas(areas: string[]) {
  const { supabase, userId } = await requireUser();
  const clean = [...new Set(areas.filter((a) => AREA_LIST.some((x) => x.id === a)))];
  const { error } = await supabase.from("profiles").update({ areas: clean }).eq("id", userId);
  if (error) return { error: "No se pudieron guardar tus áreas." };
  revalidatePath("/", "layout");
  return { ok: true, count: clean.length };
}

/**
 * Lo que decides sobre un tema sorpresa: guardarlo o pasarlo. Los pasados
 * también se anotan, para que no te los vuelva a mostrar.
 */
export async function decideTopic(input: InterestInput, status: "guardado" | "descartado") {
  const { supabase, userId } = await requireUser();
  const label = input.label.trim().slice(0, 120);
  if (!input.key || !label) return { error: "Ese tema viene incompleto." };
  const { error } = await supabase.from("interests").upsert(
    { user_id: userId, key: input.key, label, area: input.area.slice(0, 40), status, position: Date.now() % 100000 },
    { onConflict: "user_id,key" },
  );
  if (error) return { error: "No se pudo guardar. Intenta otra vez." };
  revalidatePath("/descubrir");
  return { ok: true };
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
