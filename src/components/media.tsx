import {
  Article,
  BookOpen,
  ChatsCircle,
  FileText,
  GraduationCap,
  Microphone,
  PlayCircle,
  Sparkle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Item, ItemKind, ItemStatus } from "@/lib/types";

export const KIND_META: Record<ItemKind, { label: string; icon: Icon }> = {
  video: { label: "Video", icon: PlayCircle },
  podcast: { label: "Podcast", icon: Microphone },
  libro: { label: "Libro", icon: BookOpen },
  curso: { label: "Curso", icon: GraduationCap },
  articulo: { label: "Artículo", icon: Article },
  documento: { label: "Documento", icon: FileText },
  hilo: { label: "Hilo", icon: ChatsCircle },
  otro: { label: "Otro", icon: Sparkle },
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  por_vincular: "Por vincular",
  pendiente: "Pendiente",
  en_curso: "En curso",
  terminado: "Terminado",
};

export const ORIGIN_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
  x: "X",
  web: "Web",
  otro: "Otro",
};

export function progressOf(item: Pick<Item, "kind" | "progress_seconds" | "duration_seconds" | "progress_pages" | "total_pages" | "status">) {
  if (item.status === "terminado") return 1;
  if (item.kind === "libro" && item.total_pages) return Math.min(1, item.progress_pages / item.total_pages);
  if (item.duration_seconds) return Math.min(1, item.progress_seconds / item.duration_seconds);
  return 0;
}

export function aspectFor(kind: ItemKind) {
  if (kind === "libro") return "aspect-[2/3]";
  if (kind === "podcast") return "aspect-square";
  return "aspect-video";
}

/** Miniatura con respaldo: si no hay imagen, el ícono del formato sobre un tono neutro. */
export function Thumb({
  src,
  kind,
  alt = "",
  className = "",
  rounded = "rounded-control",
}: {
  src: string | null;
  kind: ItemKind;
  alt?: string;
  className?: string;
  rounded?: string;
}) {
  const { icon: KindIcon } = KIND_META[kind];
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${rounded} ${className}`}>
      {src ? (
        // Miniaturas remotas (YouTube, Open Library, Apple): sin optimizador para no gastar cuota.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-3">
          <KindIcon size={32} aria-hidden />
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, tone = "tint", label }: { value: number; tone?: "tint" | "ok" | "bad"; label?: string }) {
  const color = tone === "ok" ? "bg-ok" : tone === "bad" ? "bg-bad" : "bg-tint";
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className={`h-full rounded-full ${color} transition-[width] duration-300 ease-out-expo`} style={{ width: `${pct}%` }} />
    </div>
  );
}
