import { NextResponse, type NextRequest } from "next/server";
import { detectOrigin, extractYouTubeId, getYouTubeVideos, hasYouTubeKey, searchYouTube } from "@/lib/media";
import { profileFromToken } from "@/lib/token-auth";
import type { MediaResult } from "@/lib/types";

/**
 * Captura desde el menú Compartir de iOS (Atajo "Guardar en Fuellness").
 * Recibe el nombre que escribiste y el link del reel; busca el video original
 * en YouTube y deja las opciones listas para que elijas con un toque.
 */
export async function POST(request: NextRequest) {
  const auth = await profileFromToken(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Token inválido. Cópialo de nuevo en Ajustes." }, { status: 401 });
  const { admin, profile } = auth;

  let body: Record<string, unknown> = {};
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) body = await request.json().catch(() => ({}));
  else body = Object.fromEntries((await request.formData().catch(() => new FormData())).entries());

  const title = String(body.title ?? body.titulo ?? "").trim().slice(0, 300);
  const url = String(body.url ?? body.link ?? "").trim() || null;
  if (!title && !url) return NextResponse.json({ ok: false, message: "Falta el nombre del video." }, { status: 400 });

  let candidates: MediaResult[] = [];
  let linked: { result: MediaResult; chapters: { start: number; title: string }[] } | null = null;
  const ytId = url ? extractYouTubeId(url) : null;

  if (hasYouTubeKey()) {
    try {
      if (ytId) [linked] = await getYouTubeVideos([ytId]);
      else if (title) candidates = await searchYouTube(title, 5);
    } catch {
      // se guarda sin candidatos; se pueden buscar después en la app
    }
  }

  const row = {
    user_id: profile.id,
    title: title || linked?.result.title || "Guardado sin nombre",
    kind: "video",
    origin: detectOrigin(url),
    origin_url: url,
    status: linked ? "pendiente" : "por_vincular",
    candidates,
    ...(linked
      ? {
          media_provider: "youtube",
          media_id: linked.result.id,
          media_title: linked.result.title,
          media_author: linked.result.author,
          media_url: linked.result.url,
          thumbnail_url: linked.result.thumbnail,
          duration_seconds: linked.result.durationSeconds,
          chapters: linked.chapters,
        }
      : {}),
  };

  const { error } = await admin.from("items").insert(row);
  if (error) return NextResponse.json({ ok: false, message: "No se pudo guardar." }, { status: 500 });

  const message = linked
    ? `Guardado: ${linked.result.title}`
    : candidates.length
      ? `Guardado. Encontré ${candidates.length} opciones en YouTube; elige la correcta en la app.`
      : "Guardado. Búscalo en la app cuando tengas un momento.";
  return NextResponse.json({ ok: true, message });
}
