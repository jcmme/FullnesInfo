import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowSquareOut, CaretLeft, InstagramLogo, LinkSimple, TiktokLogo } from "@phosphor-icons/react/ssr";
import { ItemActions, LinkPanel, ProgressPanel, StaticCover } from "@/components/item-detail";
import { KIND_META, ORIGIN_LABEL, STATUS_LABEL } from "@/components/media";
import { NoteComposer } from "@/components/note-composer";
import { YouTubePlayer } from "@/components/youtube-player";
import { formatDayShort } from "@/lib/day";
import { todayKey } from "@/lib/engine";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { notesOfToday, wordsOfToday } from "@/lib/notes";
import { getSession } from "@/lib/session";
import type { Entry, Item } from "@/lib/types";

const PROVIDER_LINK: Record<string, string> = {
  youtube: "Abrir en YouTube",
  itunes: "Abrir en Apple Podcasts",
  openlibrary: "Ver en Open Library",
  manual: "Abrir enlace",
};

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, now } = await getSession();
  const today = todayKey(profile, new Date(now));
  const [{ data }, entriesRes, todayRes] = await Promise.all([
    supabase.from("items").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    supabase.from("entries").select("*").eq("user_id", userId).eq("item_id", id).order("created_at", { ascending: false }),
    supabase.from("entries").select("*").eq("user_id", userId).eq("day", today).order("created_at"),
  ]);
  if (!data) notFound();
  const item = data as Item;
  const entries = (entriesRes.data ?? []) as Entry[];
  // Lo que llevas hoy en todas tus notas: el editor necesita el total del día.
  const todayNotes = notesOfToday((todayRes.data ?? []) as Entry[]);
  const linked = Boolean(item.media_provider);
  const isYouTube = item.media_provider === "youtube" && item.media_id;
  const OriginIcon = item.origin === "instagram" ? InstagramLogo : item.origin === "tiktok" ? TiktokLogo : LinkSimple;
  const openUrl = isYouTube
    ? `https://youtu.be/${item.media_id}${item.progress_seconds ? `?t=${item.progress_seconds}` : ""}`
    : item.media_url;

  return (
    <div className="mx-auto max-w-5xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/guardados" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Guardados
        </Link>
      </div>

      <div className="grid gap-6 px-4 pb-10 pt-2 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-8 md:px-8">
        <div className="min-w-0 space-y-5">
          {isYouTube ? (
            <YouTubePlayer
              videoId={item.media_id!}
              start={item.status === "terminado" ? 0 : item.progress_seconds}
              thumbnail={item.thumbnail_url}
              title={item.media_title ?? item.title}
            />
          ) : linked && item.thumbnail_url ? (
            <StaticCover item={item} />
          ) : null}

          <div>
            <h1 className="title-1 text-balance">{item.media_title ?? item.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`chip ${
                  item.status === "por_vincular"
                    ? "bg-tint-soft text-tint-ink"
                    : item.status === "terminado"
                      ? "bg-ok-soft text-ok"
                      : "bg-surface-2 text-ink-2"
                }`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              <span className="caption text-ink-2">
                {KIND_META[item.kind].label}
                {item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ""}
                {item.total_pages ? ` · ${item.total_pages} páginas` : ""}
                {item.media_author ? ` · ${item.media_author}` : ""}
              </span>
            </div>
            {item.media_title && item.media_title !== item.title && (
              <p className="caption mt-2 text-ink-2">Lo guardaste como “{item.title}”.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* La nota está en esta misma pantalla: el botón solo te baja a ella. */}
            <a href="#nota" className="btn btn-primary md:hidden">
              Registrar lo que vi
            </a>
            {openUrl && (
              <a href={openUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <ArrowSquareOut size={18} aria-hidden />
                {PROVIDER_LINK[item.media_provider ?? "manual"]}
              </a>
            )}
            {item.origin_url && (
              <a href={item.origin_url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <OriginIcon size={18} aria-hidden />
                Ver clip{item.origin ? ` en ${ORIGIN_LABEL[item.origin]}` : ""}
              </a>
            )}
          </div>

          {item.note && (
            <blockquote className="rounded-card bg-surface-2 p-4 footnote text-ink-2">
              <span className="mb-1 block font-semibold text-ink">Por qué lo guardaste</span>
              {item.note}
            </blockquote>
          )}

          {(item.kind === "video" || item.kind === "podcast" || item.kind === "libro") && <LinkPanel item={item} />}
        </div>

        <div className="min-w-0 space-y-5">
          <section aria-labelledby="nota-titulo" id="nota" className="scroll-mt-4">
            <h2 id="nota-titulo" className="title-2">
              Escribe lo que te llevas
            </h2>
            <p className="footnote mb-4 mt-0.5 text-pretty text-ink-2">Aquí mismo, sin salir del video. Lo que escribas cuenta para hoy.</p>
            <NoteComposer
              stay
              subject={{ key: `item:${item.id}`, kind: item.kind, title: item.media_title ?? item.title, itemId: item.id, item }}
              minWords={profile.min_words}
              todayNotes={todayNotes}
              todayWords={wordsOfToday(todayNotes)}
            />
          </section>

          {item.status !== "por_vincular" && <ProgressPanel item={item} />}

          <section aria-labelledby="notas" className="card p-5">
            <h2 id="notas" className="title-2">
              Tus notas
            </h2>
            {entries.length === 0 ? (
              <p className="footnote mt-2 text-ink-2">
                Todavía no escribes sobre esto. Cada vez que avances, registra lo que te llevas.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {entries.map((e) => (
                  <li key={e.id}>
                    <p className="caption font-semibold text-ink-2">
                      {formatDayShort(e.day)} · {e.word_count} palabras
                      {e.minutes ? ` · ${e.minutes} min` : ""}
                    </p>
                    <p className="footnote mt-1 whitespace-pre-line text-pretty">{e.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ItemActions item={item} />
          {item.status === "terminado" && item.progress_seconds > 0 && (
            <p className="caption text-ink-2">Último punto guardado: {formatTimestamp(item.progress_seconds)}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
