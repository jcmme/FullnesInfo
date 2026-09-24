import { NextResponse, type NextRequest } from "next/server";
import { getOverview, syncState } from "@/lib/engine";
import { profileFromToken } from "@/lib/token-auth";

/**
 * Estado del día para el Atajo de recordatorio (8:15 AM) y el de la noche.
 * Devuelve "message": una frase lista para mostrarse como notificación.
 */
export async function GET(request: NextRequest) {
  const auth = await profileFromToken(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Token inválido." }, { status: 401 });
  const { admin, profile } = auth;

  await syncState(admin, profile);
  const [overview, failures, punishments, byLink] = await Promise.all([
    getOverview(admin, profile, new Date(), 1),
    admin.from("failures").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "pendiente"),
    admin.from("punishments").select("title").eq("user_id", profile.id).in("status", ["asignado", "en_curso"]),
    admin.from("items").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "por_vincular"),
  ]);

  const pendingSpins = failures.count ?? 0;
  const active = punishments.data ?? [];
  const parts: string[] = [];
  if (pendingSpins) parts.push(`Tienes ${pendingSpins === 1 ? "una ruleta" : `${pendingSpins} ruletas`} por girar.`);
  if (active.length) parts.push(`Castigo pendiente: ${active[0].title}${active.length > 1 ? ` y ${active.length - 1} más` : ""}.`);
  if (overview.todayDone) parts.push(`Hoy ya cumpliste. Racha: ${overview.streak} ${overview.streak === 1 ? "día" : "días"}.`);
  else if (overview.todayFrozen) parts.push("Hoy usaste comodín: no cuenta y tu racha sigue a salvo.");
  else
    parts.push(
      overview.streak > 0
        ? `Hoy falta tu registro. Está en juego una racha de ${overview.streak} ${overview.streak === 1 ? "día" : "días"}.`
        : "Hoy falta tu registro. Empieza una racha nueva.",
    );
  if (byLink.count) parts.push(`${byLink.count} guardados esperan su video original.`);

  return NextResponse.json({
    ok: true,
    day: overview.today,
    done: overview.todayDone,
    frozen: overview.todayFrozen,
    words: overview.todayWords,
    minWords: profile.min_words,
    streak: overview.streak,
    pendingSpins,
    activePunishments: active.length,
    toLink: byLink.count ?? 0,
    message: parts.join(" "),
  });
}
