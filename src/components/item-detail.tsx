"use client";

import { ArrowCounterClockwise, CheckCircle, Circle, PencilSimple, Play, Trash } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { deleteItem, linkItem, setItemStatus, updateProgress } from "@/app/actions/items";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { Chapter, Item, MediaResult } from "@/lib/types";
import { ProgressBar, Thumb, aspectFor } from "./media";
import { MediaSearch, ResultRow, sourceForKind } from "./media-search";

/** Miniatura que se convierte en reproductor al tocarla; arranca donde te quedaste. */
export function YouTubePlayer({ videoId, start, thumbnail, title }: { videoId: string; start: number; thumbnail: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-card bg-black shadow-lift">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&start=${Math.floor(start)}`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} className="press group relative block w-full" aria-label={`Reproducir ${title}`}>
      <Thumb src={thumbnail} kind="video" className="aspect-video shadow-lift" rounded="rounded-card" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="material flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-ink shadow-card transition-transform duration-200 group-hover:scale-105">
          <Play size={20} weight="fill" aria-hidden />
          {start > 0 ? `Seguir desde ${formatTimestamp(start)}` : "Reproducir"}
        </span>
      </span>
    </button>
  );
}

export function StaticCover({ item }: { item: Item }) {
  return (
    <Thumb
      src={item.thumbnail_url}
      kind={item.kind}
      className={`${aspectFor(item.kind)} shadow-lift ${item.kind === "video" ? "w-full" : "mx-auto w-48 md:mx-0"}`}
      rounded="rounded-card"
    />
  );
}

function sessionsPlan(remaining: number) {
  if (remaining <= 0) return null;
  const blocks = Math.ceil(remaining / (25 * 60));
  return blocks <= 1
    ? `Te faltan ${formatDuration(remaining)}. Cabe en una sola sesión.`
    : `Te faltan ${formatDuration(remaining)}. En sesiones de 25 min son ${blocks} días.`;
}

export function ProgressPanel({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const isBook = item.kind === "libro";
  const total = isBook ? item.total_pages : item.duration_seconds;
  const current = isBook ? item.progress_pages : item.progress_seconds;
  const ratio = item.status === "terminado" ? 1 : total ? Math.min(1, current / total) : 0;
  const chapters: Chapter[] = item.chapters ?? [];

  function save(input: { timestamp?: string; seconds?: number; pages?: number }) {
    setError(null);
    start(async () => {
      const res = await updateProgress(item.id, input);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setEditing(false);
        setValue("");
      }
    });
  }

  return (
    <section aria-labelledby="avance" className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="avance" className="title-2">
          Avance
        </h2>
        <span className="footnote tabular text-ink-2">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={ratio} tone={item.status === "terminado" ? "ok" : "tint"} label="Avance" />
      </div>
      <p className="footnote mt-3 text-ink-2 text-pretty">
        {item.status === "terminado"
          ? "Terminado."
          : isBook
            ? total
              ? `Página ${current} de ${total}.`
              : `Vas en la página ${current}.`
            : total
              ? current > 0
                ? `Vas en ${formatTimestamp(current)} de ${formatTimestamp(total)}. ${sessionsPlan(total - current) ?? ""}`
                : sessionsPlan(total)
              : current > 0
                ? `Vas en ${formatTimestamp(current)}.`
                : "Aún no empiezas."}
      </p>

      {item.status !== "terminado" &&
        (editing ? (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (isBook) save({ pages: Number(value) });
              else save({ timestamp: value });
            }}
          >
            <label className="flex-1">
              <span className="sr-only">{isBook ? "Página actual" : "Minuto donde te quedaste"}</span>
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="numeric"
                placeholder={isBook ? "Página" : "1:23:45"}
                className="field tabular"
              />
            </label>
            <button type="submit" disabled={pending || !value.trim()} className="btn btn-primary">
              Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary mt-4">
            <PencilSimple size={18} aria-hidden />
            {isBook ? "¿En qué página vas?" : "¿En qué minuto te quedaste?"}
          </button>
        ))}
      {error && <p className="caption mt-2 text-bad">{error}</p>}

      {chapters.length > 0 && (
        <div className="mt-6">
          <h3 className="headline">Capítulos</h3>
          <p className="caption mt-0.5 text-ink-2">Marca hasta dónde viste; el siguiente capítulo es tu punto de retorno.</p>
          <ol className="mt-2 divide-y hairline">
            {chapters.map((ch, i) => {
              const end = chapters[i + 1]?.start ?? item.duration_seconds ?? ch.start;
              const seen = item.status === "terminado" || item.progress_seconds >= end;
              const currentChapter = !seen && item.progress_seconds >= ch.start;
              return (
                <li key={ch.start} className="flex items-center gap-3 py-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save({ seconds: seen ? ch.start : end })}
                    aria-label={seen ? `Desmarcar ${ch.title}` : `Marcar ${ch.title} como visto`}
                    className={`press grid size-11 shrink-0 place-items-center rounded-full ${seen ? "text-ok" : "text-ink-3"}`}
                  >
                    {seen ? <CheckCircle size={24} weight="fill" aria-hidden /> : <Circle size={24} aria-hidden />}
                  </button>
                  <span className={`min-w-0 flex-1 footnote ${seen ? "text-ink-2" : ""} ${currentChapter ? "font-semibold" : ""}`}>
                    {ch.title}
                  </span>
                  {item.media_provider === "youtube" && item.media_id ? (
                    <a
                      href={`https://youtu.be/${item.media_id}?t=${ch.start}`}
                      target="_blank"
                      rel="noreferrer"
                      className="caption shrink-0 tabular font-semibold text-tint-ink"
                    >
                      {formatTimestamp(ch.start)}
                    </a>
                  ) : (
                    <span className="caption shrink-0 tabular text-ink-2">{formatTimestamp(ch.start)}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export function LinkPanel({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  const [searching, setSearching] = useState(item.status === "por_vincular" && item.candidates.length === 0);
  const [chosen, setChosen] = useState<string | null>(null);
  const candidates: MediaResult[] = item.candidates ?? [];

  const pick = (r: MediaResult) => {
    setChosen(r.id);
    start(async () => {
      await linkItem(item.id, r);
      setSearching(false);
    });
  };

  if (item.status !== "por_vincular" && !searching) {
    return (
      <button type="button" onClick={() => setSearching(true)} className="btn btn-ghost px-3">
        <ArrowCounterClockwise size={18} aria-hidden />
        No es este, buscar otro
      </button>
    );
  }

  return (
    <section aria-labelledby="vincular" className="card p-4">
      <h2 id="vincular" className="title-2 px-1">
        {item.status === "por_vincular" ? "¿Cuál es el original?" : "Cambiar vínculo"}
      </h2>
      {pending && <p className="footnote px-1 pt-1 text-ink-2">Vinculando y leyendo capítulos…</p>}
      {candidates.length > 0 && !searching && (
        <>
          <p className="footnote px-1 pb-2 pt-1 text-ink-2">Encontré esto con el nombre que escribiste. Toca el correcto.</p>
          <ul className="space-y-1">
            {candidates.map((r) => (
              <li key={r.id}>
                <ResultRow result={r} selected={chosen === r.id} onSelect={() => pick(r)} />
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setSearching(true)} className="btn btn-ghost mt-2 px-3">
            Ninguno, buscar de otra forma
          </button>
        </>
      )}
      {searching && (
        <div className="mt-3">
          <MediaSearch
            initialQuery={item.title}
            initialSource={sourceForKind(item.kind)}
            selectedId={chosen}
            autoSearch={item.status === "por_vincular"}
            onPick={pick}
          />
        </div>
      )}
    </section>
  );
}

export function ItemActions({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {item.status === "terminado" ? (
        <button type="button" disabled={pending} onClick={() => start(() => setItemStatus(item.id, "en_curso"))} className="btn btn-secondary">
          Volver a en curso
        </button>
      ) : (
        item.status !== "por_vincular" && (
          <button type="button" disabled={pending} onClick={() => start(() => setItemStatus(item.id, "terminado"))} className="btn btn-secondary">
            <CheckCircle size={18} aria-hidden />
            Marcar terminado
          </button>
        )
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Eliminar este guardado? Tus notas se conservan, pero pierdes el vínculo y el avance.")) {
            start(() => deleteItem(item.id));
          }
        }}
        className="btn btn-ghost px-3 text-bad hover:bg-bad-soft"
      >
        <Trash size={18} aria-hidden />
        Eliminar
      </button>
    </div>
  );
}
