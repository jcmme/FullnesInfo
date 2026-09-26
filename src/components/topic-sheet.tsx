"use client";

import { ArrowSquareOut, BookOpen, Check, FilmSlate, MagnifyingGlass, Newspaper, Plus } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { saveLink } from "@/app/actions/topics";
import type { ItemKind, MediaResult, TopicLink } from "@/lib/types";
import { MediaSearch } from "./media-search";
import { SavedMedia, saveWithoutLeaving } from "./saved-media";

const ICON = { libro: BookOpen, video: FilmSlate, articulo: Newspaper } as const;

/** Una recomendación de la ficha, con su botón para mandarla a tu biblioteca. */
export function Recommendation({ link, kind, topicTitle }: { link: TopicLink; kind: keyof typeof ICON; topicTitle: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const Icon = ICON[kind];
  const by = link.author ?? link.channel ?? link.site;

  return (
    <li className="card flex items-start gap-3 p-4">
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-tint-ink">
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <a href={link.url} target="_blank" rel="noreferrer" className="press flex items-start gap-1.5">
          <span className="headline text-balance">{link.title}</span>
          <ArrowSquareOut size={14} className="mt-1 shrink-0 text-ink-3" aria-hidden />
        </a>
        {by && <p className="caption mt-0.5 text-ink-2">{by}</p>}
        <p className="footnote mt-1.5 text-pretty text-ink-2">{link.why}</p>
        <button
          type="button"
          disabled={pending || saved}
          onClick={() =>
            start(async () => {
              const res = await saveLink({
                title: link.title,
                url: link.url,
                kind: (kind === "articulo" ? "articulo" : kind) as ItemKind,
                note: `Recomendado en ${topicTitle}`,
              });
              if (!("error" in res)) setSaved(true);
            })
          }
          className="btn btn-secondary mt-3 min-h-11 px-3.5 footnote"
        >
          {saved ? <Check size={16} weight="bold" aria-hidden /> : <Plus size={16} weight="bold" aria-hidden />}
          {saved ? "En tu biblioteca" : pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </li>
  );
}

/** Buscar más sobre el tema. Lo que guardes se queda aquí, listo para verlo. */
export function TopicSearch({ query, title }: { query: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ result: MediaResult; itemId: string } | null>(null);
  const [saving, start] = useTransition();

  const save = (r: MediaResult) =>
    start(async () => {
      const itemId = await saveWithoutLeaving(r, title, `Sobre ${title}`);
      if (!itemId) return;
      setPicked({ result: r, itemId });
      setOpen(false);
    });

  return (
    <div className="space-y-3">
      {picked && <SavedMedia result={picked.result} itemId={picked.itemId} />}
      {open ? (
        saving ? (
          <p className="footnote text-ink-2">Guardando…</p>
        ) : (
          <MediaSearch initialQuery={query} sourceQueries={{ libro: title, podcast: title }} autoSearch onPick={save} />
        )
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary w-full">
          <MagnifyingGlass size={18} aria-hidden />
          {picked ? "Buscar otro" : "Buscar más sobre esto"}
        </button>
      )}
    </div>
  );
}
