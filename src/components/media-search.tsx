"use client";

import { CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { SearchSource } from "@/lib/media";
import { formatDuration } from "@/lib/format";
import type { ItemKind, MediaResult } from "@/lib/types";
import { Thumb } from "./media";

const SOURCE_LABEL: Record<SearchSource, string> = { youtube: "YouTube", podcast: "Podcasts", libro: "Libros" };
const SOURCE_KIND: Record<SearchSource, ItemKind> = { youtube: "video", podcast: "podcast", libro: "libro" };

export function sourceForKind(kind: ItemKind): SearchSource {
  return kind === "libro" ? "libro" : kind === "podcast" ? "podcast" : "youtube";
}

export function ResultRow({
  result,
  selected,
  onSelect,
  actionLabel,
}: {
  result: MediaResult;
  selected?: boolean;
  onSelect: () => void;
  actionLabel?: string;
}) {
  const kind = SOURCE_KIND[result.provider === "openlibrary" ? "libro" : result.provider === "itunes" ? "podcast" : "youtube"];
  const meta = [
    result.author,
    result.durationSeconds ? formatDuration(result.durationSeconds) : null,
    result.totalPages ? `${result.totalPages} págs.` : null,
    result.published ? result.published.slice(0, 4) : null,
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`press flex w-full items-center gap-3 rounded-card p-2 text-left transition-colors ${
        selected ? "bg-tint-soft ring-2 ring-tint" : "hover:bg-surface-2"
      }`}
    >
      <Thumb
        src={result.thumbnail}
        kind={kind}
        className={kind === "libro" ? "h-20 w-14 shrink-0" : kind === "podcast" ? "size-20 shrink-0" : "aspect-video w-32 shrink-0 sm:w-40"}
        rounded="rounded-[10px]"
      />
      <span className="min-w-0 flex-1">
        <span className="headline line-clamp-2">{result.title}</span>
        <span className="footnote mt-0.5 line-clamp-1 block text-ink-2">{meta.join(" · ")}</span>
        {actionLabel && <span className="footnote mt-1 block font-semibold text-tint-ink">{actionLabel}</span>}
      </span>
      {selected && <CheckCircle size={24} weight="fill" className="shrink-0 text-tint-ink" aria-hidden />}
    </button>
  );
}

/**
 * Buscador con resultados visuales. No busca mientras escribes: cada búsqueda
 * en YouTube gasta cuota (unas 100 al día gratis), así que busca al confirmar.
 */
export function MediaSearch({
  initialQuery = "",
  initialSource = "youtube",
  selectedId,
  onPick,
  autoSearch = false,
}: {
  initialQuery?: string;
  initialSource?: SearchSource;
  selectedId?: string | null;
  onPick: (result: MediaResult) => void;
  autoSearch?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState<SearchSource>(initialSource);
  const [results, setResults] = useState<MediaResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAuto = useRef(false);

  async function run(q = query, s = source) {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?source=${s}&q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { results?: MediaResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falló la búsqueda.");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló la búsqueda.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoSearch || didAuto.current || !initialQuery) return;
    didAuto.current = true;
    const t = setTimeout(() => void run(initialQuery, initialSource), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Dónde buscar" className="grid grid-cols-3 rounded-full bg-surface-2 p-1">
        {(Object.keys(SOURCE_LABEL) as SearchSource[]).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={source === s}
            onClick={() => {
              setSource(s);
              if (results) void run(query, s);
            }}
            className={`press min-h-9 rounded-full footnote font-semibold transition-colors ${
              source === s ? "bg-surface text-ink shadow-card" : "text-ink-2"
            }`}
          >
            {SOURCE_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
            placeholder="Nombre, tema o link de YouTube"
            className="field pl-9"
          />
        </label>
        <button type="button" onClick={() => void run()} disabled={loading || query.trim().length < 2} className="btn btn-secondary">
          Buscar
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-control bg-bad-soft px-4 py-3 footnote text-bad">
          {error}
        </p>
      )}

      {loading && (
        <ul className="space-y-2" aria-label="Buscando">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 p-2">
              <div className="aspect-video w-32 shrink-0 animate-pulse rounded-[10px] bg-surface-2 sm:w-40" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-4/5 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && results && results.length === 0 && (
        <p className="footnote px-2 py-4 text-ink-2">Sin resultados. Prueba con el nombre del invitado, del canal o una frase del clip.</p>
      )}

      {!loading && results && results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={`${r.provider}-${r.id}`}>
              <ResultRow result={r} selected={selectedId === r.id} onSelect={() => onPick(r)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
