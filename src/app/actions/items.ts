"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { detectOrigin, getYouTubeVideos } from "@/lib/media";
import { parseTimestamp } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import type { Chapter, ItemKind, ItemStatus, MediaResult } from "@/lib/types";

const KINDS: ItemKind[] = ["video", "podcast", "libro", "curso", "articulo", "documento", "hilo", "otro"];
const SEARCHABLE: ItemKind[] = ["video", "podcast", "libro"];

async function mediaFields(media: MediaResult) {
  let chapters: Chapter[] = [];
  let result = media;
  if (media.provider === "youtube") {
    try {
      const [video] = await getYouTubeVideos([media.id]);
      if (video) {
        chapters = video.chapters;
        result = video.result;
      }
    } catch {
      // sin capítulos si YouTube falla; el resto del guardado sigue
    }
  }
  return {
    media_provider: result.provider,
    media_id: result.id,
    media_title: result.title,
    media_author: result.author,
    media_url: result.url,
    thumbnail_url: result.thumbnail,
    duration_seconds: result.durationSeconds,
    total_pages: result.totalPages,
    chapters,
    candidates: [],
  };
}

function parseMedia(raw: FormDataEntryValue | null): MediaResult | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(String(raw)) as MediaResult;
    return m && m.provider && m.id ? m : null;
  } catch {
    return null;
  }
}

export type ItemFormState = { error?: string } | undefined;

export async function createItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const { supabase, userId } = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "video") as ItemKind;
  const kind = KINDS.includes(kindRaw) ? kindRaw : "otro";
  const originUrl = String(formData.get("originUrl") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const media = parseMedia(formData.get("media"));

  if (!title && !media) return { error: "Escribe cómo se llama o de qué trata." };

  const base = {
    user_id: userId,
    title: (title || media?.title || "Sin título").slice(0, 300),
    kind,
    origin: detectOrigin(originUrl),
    origin_url: originUrl,
    note,
  };

  const row = media
    ? { ...base, status: "pendiente" as ItemStatus, ...(await mediaFields(media)) }
    : {
        ...base,
        status: (SEARCHABLE.includes(kind) ? "por_vincular" : "pendiente") as ItemStatus,
        media_provider: originUrl && !SEARCHABLE.includes(kind) ? "manual" : null,
        media_url: !SEARCHABLE.includes(kind) ? originUrl : null,
      };

  const { data, error } = await supabase.from("items").insert(row).select("id").single();
  if (error || !data) return { error: "No se pudo guardar. Intenta otra vez." };

  revalidatePath("/", "layout");
  redirect(`/guardados/${data.id}`);
}

export async function linkItem(itemId: string, media: MediaResult) {
  const { supabase, userId } = await requireUser();
  const { data: current } = await supabase.from("items").select("status").eq("id", itemId).eq("user_id", userId).single();
  const status = current?.status === "por_vincular" ? "pendiente" : current?.status;
  await supabase
    .from("items")
    .update({ ...(await mediaFields(media)), status, progress_seconds: 0, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function updateProgress(itemId: string, input: { timestamp?: string; seconds?: number; pages?: number }) {
  const { supabase, userId } = await requireUser();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const seconds = input.seconds ?? (input.timestamp ? parseTimestamp(input.timestamp) : null);
  if (seconds !== null && seconds !== undefined) update.progress_seconds = Math.max(0, Math.round(seconds));
  if (input.pages !== undefined && Number.isFinite(input.pages)) update.progress_pages = Math.max(0, Math.round(input.pages));
  if (Object.keys(update).length === 1) return { error: "Formato no válido. Usa 1:23:45 o 45:10." };

  const { data: current } = await supabase.from("items").select("status").eq("id", itemId).eq("user_id", userId).single();
  if (current?.status === "pendiente") update.status = "en_curso";
  await supabase.from("items").update(update).eq("id", itemId).eq("user_id", userId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setItemStatus(itemId: string, status: ItemStatus) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("items")
    .update({
      status,
      finished_at: status === "terminado" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function deleteItem(itemId: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("items").delete().eq("id", itemId).eq("user_id", userId);
  revalidatePath("/", "layout");
  redirect("/guardados");
}
