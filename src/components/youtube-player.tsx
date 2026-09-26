"use client";

import { Play } from "@phosphor-icons/react";
import { useState } from "react";
import { formatTimestamp } from "@/lib/format";
import { Thumb } from "./media";

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
