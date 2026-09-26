"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";
import { createItem } from "@/app/actions/items";
import type { ItemKind, MediaResult } from "@/lib/types";
import { YouTubePlayer } from "./youtube-player";

export const kindOf = (r: MediaResult): ItemKind => (r.provider === "openlibrary" ? "libro" : r.provider === "itunes" ? "podcast" : "video");

/**
 * Guarda lo que encontraste sin moverte de donde estás: devuelve el id del
 * guardado para poder mostrarlo en esta misma pantalla.
 */
export async function saveWithoutLeaving(result: MediaResult, title: string, note: string): Promise<string | null> {
  const fd = new FormData();
  fd.set("title", title);
  fd.set("kind", kindOf(result));
  fd.set("note", note);
  fd.set("media", JSON.stringify(result));
  fd.set("stay", "1");
  const res = await createItem(undefined, fd);
  return res?.id ?? null;
}

/** Lo que acabas de guardar, listo para verlo aquí mismo. */
export function SavedMedia({ result, itemId }: { result: MediaResult; itemId: string }) {
  return (
    <div>
      {result.provider === "youtube" ? (
        <YouTubePlayer videoId={result.id} start={0} thumbnail={result.thumbnail} title={result.title} />
      ) : (
        <a href={result.url} target="_blank" rel="noreferrer" className="btn btn-secondary w-full">
          <ArrowSquareOut size={18} aria-hidden />
          Abrir {result.title}
        </a>
      )}
      <p className="caption mt-2 text-ink-2">
        Ya está en tu biblioteca.{" "}
        <Link href={`/guardados/${itemId}`} className="font-semibold text-tint-ink">
          Ver su avance y capítulos
        </Link>
      </p>
    </div>
  );
}
