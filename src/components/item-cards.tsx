import Link from "next/link";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { Item } from "@/lib/types";
import { KIND_META, ProgressBar, STATUS_LABEL, Thumb, progressOf } from "./media";

function remainingText(item: Item) {
  if (item.kind === "libro" && item.total_pages) {
    return item.progress_pages ? `Página ${item.progress_pages} de ${item.total_pages}` : `${item.total_pages} páginas`;
  }
  if (item.duration_seconds) {
    if (item.progress_seconds > 0) {
      return `Vas en ${formatTimestamp(item.progress_seconds)} de ${formatTimestamp(item.duration_seconds)}`;
    }
    return formatDuration(item.duration_seconds);
  }
  return KIND_META[item.kind].label;
}

/** Tarjeta vertical para carruseles ("Sigue donde te quedaste"). */
export function ItemTile({ item }: { item: Item }) {
  const progress = progressOf(item);
  return (
    // Sin precarga: en Guardados hay hasta 200 de estas y cada una sería un render del servidor.
    <Link href={`/guardados/${item.id}`} prefetch={false} className="press group block w-64 shrink-0 snap-start md:w-72">
      <div className="relative">
        <Thumb src={item.thumbnail_url} kind={item.kind} className="aspect-video shadow-card" rounded="rounded-[18px]" />
        {progress > 0 && progress < 1 && (
          <div className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded-full bg-black/35">
            <div className="h-full rounded-full bg-tint" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2.5 space-y-1 px-0.5">
        <p className="headline line-clamp-2 font-display font-bold text-pretty">{item.media_title ?? item.title}</p>
        <p className="footnote text-ink-2">{remainingText(item)}</p>
      </div>
    </Link>
  );
}

/** Fila compacta para listas. */
export function ItemRow({ item, showStatus = false }: { item: Item; showStatus?: boolean }) {
  const progress = progressOf(item);
  const needsLink = item.status === "por_vincular";
  return (
    <Link href={`/guardados/${item.id}`} prefetch={false} className="press flex items-center gap-3 py-2.5">
      <Thumb
        src={item.thumbnail_url}
        kind={item.kind}
        className={item.kind === "libro" ? "h-16 w-11 shrink-0" : item.kind === "podcast" ? "size-16 shrink-0" : "h-14 w-24 shrink-0"}
        rounded="rounded-[10px]"
      />
      <div className="min-w-0 flex-1">
        <p className="headline line-clamp-2">{item.media_title ?? item.title}</p>
        <p className="footnote mt-0.5 truncate text-ink-2">
          {needsLink
            ? item.candidates.length
              ? `${item.candidates.length} opciones encontradas. Elige el original.`
              : "Falta encontrar el original."
            : [item.media_author, remainingText(item)].filter(Boolean).join(" · ")}
        </p>
        {progress > 0 && progress < 1 && (
          <div className="mt-1.5 max-w-48">
            <ProgressBar value={progress} label="Avance" />
          </div>
        )}
      </div>
      {showStatus && (
        <span
          className={`chip shrink-0 ${
            needsLink
              ? "bg-tint-soft text-tint-ink"
              : item.status === "terminado"
                ? "bg-ok-soft text-ok"
                : "bg-surface-2 text-ink-2"
          }`}
        >
          {STATUS_LABEL[item.status]}
        </span>
      )}
    </Link>
  );
}
