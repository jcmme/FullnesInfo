"use client";

import { CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { extractYouTubeId, type SearchSource } from "@/lib/media";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { ItemKind, MediaResult } from "@/lib/types";
import { Thumb } from "./media";

const SOURCE_LABEL: Record<SearchSource, string> = { youtube: "YouTube", podcast: "Podcasts", libro: "Libros" };
const SOURCE_KIND: Record<SearchSource, ItemKind> = { youtube: "video", podcast: "podcast", libro: "libro" };

export function sourceForKind(kind: ItemKind): SearchSource {
  return kind === "libro" ? "libro" : kind === "podcast" ? "podcast" : "youtube";
}

/** Búsquedas ya hechas en esta visita: repetir una consulta no gasta cuota de YouTube. */
const searchCache = new Map<string, MediaResult[]>();

function cacheKey(source: SearchSource, query: string) {
  return `${source}:${query.trim().toLowerCase()}`;
}

async function fetchResults(source: SearchSource, query: string, signal?: AbortSignal): Promise<MediaResult[]> {
  const key = cacheKey(source, query);
  const hit = searchCache.get(key);
  if (hit) return hit;
  const res = await fetch(`/api/search?source=${source}&q=${encodeURIComponent(query.trim())}`, { signal });
  const data = (await res.json()) as { results?: MediaResult[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Falló la búsqueda.");
  const results = data.results ?? [];
  searchCache.set(key, results);
  return results;
}

/* Búsqueda automática ------------------------------------------------------ */

/** Espera a que dejes de escribir: cada búsqueda en YouTube gasta cuota (unas 100 al día gratis). */
const AUTO_DELAY_MS = 800;
const AUTO_MIN_CHARS = 3;
export const AUTO_VISIBLE = 4;

function autoKey(query: string, source: SearchSource): string | null {
  const q = query.trim();
  if (q.length < AUTO_MIN_CHARS) return null;
  // Un link de Instagram o TikTok no encuentra nada en YouTube; solo se busca un link de YouTube.
  if (/^https?:\/\//i.test(q) && !(source === "youtube" && extractYouTubeId(q))) return null;
  return cacheKey(source, q);
}

type AutoState = { key: string; results: MediaResult[] | null; error: string | null };

export type AutoSearch = {
  /** Hay una consulta válida que buscar. */
  active: boolean;
  /** Esperando a que termines de escribir o a la respuesta. */
  pending: boolean;
  /** Los resultados mostrados son de la consulta anterior. */
  stale: boolean;
  results: MediaResult[] | null;
  resultsKey: string | null;
  error: string | null;
  /** Busca ya, sin esperar (tecla Buscar del teclado). */
  flush: () => void;
};

export function useAutoSearch(query: string, source: SearchSource, enabled: boolean): AutoSearch {
  const q = query.trim();
  const key = enabled ? autoKey(q, source) : null;
  const [state, setState] = useState<AutoState | null>(null);
  const [flushed, setFlushed] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    const delay = searchCache.has(key) || flushed === key ? 0 : AUTO_DELAY_MS;
    const timer = setTimeout(() => {
      fetchResults(source, q, ctrl.signal).then(
        (results) => setState({ key, results, error: null }),
        (err: unknown) => {
          if (ctrl.signal.aborted) return;
          setState({ key, results: null, error: err instanceof Error ? err.message : "Falló la búsqueda." });
        },
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key, flushed, source, q]);

  const current = key && state?.key === key ? state : null;
  // Mientras llega la nueva búsqueda se quedan los resultados anteriores (de la misma fuente).
  const previous = key && !current && state?.results && state.key.startsWith(`${source}:`) ? state : null;
  const shown = current ?? previous;
  return {
    active: key !== null,
    pending: key !== null && !current,
    stale: previous !== null,
    results: shown?.results ?? null,
    resultsKey: shown?.key ?? null,
    error: current?.error ?? null,
    flush: () => {
      if (key) setFlushed(key);
    },
  };
}

/** Tarjeta con miniatura grande para reconocer el original de un vistazo. */
export function ResultTile({
  result,
  selected,
  onSelect,
}: {
  result: MediaResult;
  selected?: boolean;
  onSelect: () => void;
}) {
  const meta = [result.author, result.published ? result.published.slice(0, 4) : null].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`press flex h-full w-full flex-col rounded-card p-1.5 text-left transition-colors ${
        selected ? "bg-tint-soft ring-2 ring-tint" : "hover:bg-surface-2"
      }`}
    >
      <span className="relative block w-full">
        <Thumb src={result.thumbnail} kind="video" className="aspect-video w-full" rounded="rounded-[14px]" />
        {result.durationSeconds ? (
          <span className="caption absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 font-semibold tabular-nums text-white">
            {formatTimestamp(result.durationSeconds)}
          </span>
        ) : null}
        {selected && (
          <CheckCircle
            size={28}
            weight="fill"
            className="absolute left-1.5 top-1.5 rounded-full bg-surface text-tint-ink"
            aria-hidden
          />
        )}
      </span>
      <span className="block px-1.5 pb-1 pt-2">
        <span className="footnote line-clamp-2 font-semibold text-ink">{result.title}</span>
        {meta && <span className="caption mt-0.5 line-clamp-1 block text-ink-2">{meta}</span>}
      </span>
    </button>
  );
}

const FOUND_NOUN: Record<SearchSource, string> = { youtube: "videos", podcast: "episodios", libro: "libros" };

const EMPTY_HINT: Record<SearchSource, string> = {
  youtube: "Sin resultados. Prueba con el nombre del invitado, del canal o una frase del clip.",
  podcast: "Sin resultados. Prueba con el nombre del programa o del invitado.",
  libro: "Sin resultados. Prueba solo con el título o el autor.",
};

/**
 * Resultados de la búsqueda automática: los 4 más parecidos y el resto a un toque.
 * Videos en cuadrícula de miniaturas; podcasts y libros en lista.
 */
export function AutoResults({
  search,
  source,
  selectedId,
  onPick,
}: {
  search: AutoSearch;
  source: SearchSource;
  selectedId?: string | null;
  onPick: (result: MediaResult) => void;
}) {
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const { results, pending, stale, error, resultsKey } = search;
  const grid = source === "youtube";

  if (!search.active) {
    return (
      <p className="footnote px-1 text-ink-2">
        Escribe el nombre arriba y aquí aparecen los {AUTO_VISIBLE} {FOUND_NOUN[source]} más parecidos.
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-control bg-bad-soft px-4 py-3 footnote text-bad">
        {error}
      </p>
    );
  }

  if (!results) {
    return (
      <ul aria-label="Buscando" className={grid ? "grid grid-cols-2 gap-2" : "space-y-2"}>
        {Array.from({ length: AUTO_VISIBLE }, (_, i) =>
          grid ? (
            <li key={i} className="p-1.5">
              <div className="aspect-video w-full rounded-[14px] bg-surface-2 motion-safe:animate-pulse" />
              <div className="mt-2.5 h-3.5 w-11/12 rounded bg-surface-2 motion-safe:animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-surface-2 motion-safe:animate-pulse" />
            </li>
          ) : (
            <li key={i} className="flex items-center gap-3 p-2">
              <div className="size-20 shrink-0 rounded-[10px] bg-surface-2 motion-safe:animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-4/5 rounded bg-surface-2 motion-safe:animate-pulse" />
                <div className="h-3 w-2/5 rounded bg-surface-2 motion-safe:animate-pulse" />
              </div>
            </li>
          ),
        )}
      </ul>
    );
  }

  if (results.length === 0) {
    return pending ? null : <p className="footnote px-1 text-ink-2">{EMPTY_HINT[source]}</p>;
  }

  const expanded = expandedFor !== null && expandedFor === resultsKey;
  const shown = expanded ? results : results.slice(0, AUTO_VISIBLE);
  const hidden = results.length - shown.length;

  return (
    <div aria-busy={pending} className={`transition-opacity duration-200 ${stale ? "opacity-50" : ""}`}>
      <p className="sr-only" aria-live="polite">
        {pending ? "Buscando" : `${results.length} resultados`}
      </p>
      <ul className={grid ? "grid grid-cols-2 gap-2" : "space-y-1"}>
        {shown.map((r) => (
          <li key={`${r.provider}-${r.id}`}>
            {grid ? (
              <ResultTile result={r} selected={selectedId === r.id} onSelect={() => onPick(r)} />
            ) : (
              <ResultRow result={r} selected={selectedId === r.id} onSelect={() => onPick(r)} />
            )}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setExpandedFor(resultsKey)} className="btn btn-ghost mt-1 px-3">
          Ver {hidden} más
        </button>
      )}
    </div>
  );
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
 * Buscador "Con botón": busca al confirmar, con pestañas de fuente y lista de
 * resultados. La búsqueda mientras escribes está en useAutoSearch.
 */
export function MediaSearch({
  initialQuery = "",
  initialSource = "youtube",
  selectedId,
  onPick,
  autoSearch = false,
  sourceQueries,
}: {
  initialQuery?: string;
  initialSource?: SearchSource;
  selectedId?: string | null;
  onPick: (result: MediaResult) => void;
  autoSearch?: boolean;
  /** Consulta sugerida por fuente (p. ej. el título del tema para libros); se usa mientras no edites el texto. */
  sourceQueries?: Partial<Record<SearchSource, string>>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [edited, setEdited] = useState(false);
  const [source, setSource] = useState<SearchSource>(initialSource);
  const [results, setResults] = useState<MediaResult[] | null>(null);
  const [resultsSource, setResultsSource] = useState<SearchSource>(initialSource);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAuto = useRef(false);

  async function run(q = query, s = source) {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      setResults((await fetchResults(s, q)).slice(0, 6));
      setResultsSource(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló la búsqueda.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoSearch || didAuto.current || !initialQuery) return;
    const t = setTimeout(() => {
      didAuto.current = true;
      void run(initialQuery, initialSource);
    }, 0);
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
              const q = edited ? query : (sourceQueries?.[s] ?? initialQuery);
              setSource(s);
              setQuery(q);
              if (results) void run(q, s);
            }}
            className={`press min-h-11 rounded-full footnote font-semibold transition-colors ${
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
            onChange={(e) => {
              setQuery(e.target.value);
              setEdited(true);
            }}
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

      {loading && !results?.length && (
        <ul className="space-y-2" aria-label="Buscando">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 p-2">
              <div className="aspect-video w-32 shrink-0 rounded-[10px] bg-surface-2 motion-safe:animate-pulse sm:w-40" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-4/5 rounded bg-surface-2 motion-safe:animate-pulse" />
                <div className="h-3 w-2/5 rounded bg-surface-2 motion-safe:animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && results && results.length === 0 && <p className="footnote px-2 py-4 text-ink-2">{EMPTY_HINT[resultsSource]}</p>}

      {results && results.length > 0 && (
        <ul aria-busy={loading} className={`space-y-1 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
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
