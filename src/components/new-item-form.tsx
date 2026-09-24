"use client";

import { CircleNotch, InstagramLogo, LinkSimple } from "@phosphor-icons/react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { createItem } from "@/app/actions/items";
import type { ItemKind, MediaResult } from "@/lib/types";
import { KIND_META } from "./media";
import { AutoResults, MediaSearch, ResultRow, sourceForKind, useAutoSearch } from "./media-search";

const MAIN_KINDS: ItemKind[] = ["video", "podcast", "libro"];
const OTHER_KINDS: ItemKind[] = ["curso", "articulo", "documento", "hilo", "otro"];

/* Cómo buscar el original: mientras escribes o con el botón Buscar. Se recuerda en este dispositivo. */
type SearchMode = "auto" | "manual";
const MODE_KEY = "fullnes:modo-busqueda";
const MODE_LABEL: Record<SearchMode, string> = { auto: "Al escribir", manual: "Con botón" };
const modeListeners = new Set<() => void>();
let memoryMode: SearchMode | null = null;

function readMode(): SearchMode {
  if (memoryMode) return memoryMode;
  try {
    return localStorage.getItem(MODE_KEY) === "manual" ? "manual" : "auto";
  } catch {
    return "auto";
  }
}

function saveMode(mode: SearchMode) {
  memoryMode = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // sin almacenamiento: vale para esta visita
  }
  modeListeners.forEach((listener) => listener());
}

function subscribeMode(listener: () => void) {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

export function NewItemForm({ hasYouTube }: { hasYouTube: boolean }) {
  const [state, action, pending] = useActionState(createItem, undefined);
  const [title, setTitle] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [kind, setKind] = useState<ItemKind>("video");
  const [picked, setPicked] = useState<MediaResult | null>(null);
  const [searching, setSearching] = useState(false);
  const mode = useSyncExternalStore(subscribeMode, readMode, (): SearchMode => "auto");
  const searchable = MAIN_KINDS.includes(kind);
  const source = sourceForKind(kind);
  const needsKey = kind === "video" && !hasYouTube;
  const auto = mode === "auto" && searchable && !needsKey;
  const search = useAutoSearch(title, source, auto && (!picked || searching));

  const pick = (r: MediaResult) => {
    setPicked(r);
    setSearching(false);
    if (!title) setTitle(r.title);
  };

  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="title" className="label">
          ¿Qué guardaste?
        </label>
        <div className="relative">
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.active) {
                e.preventDefault();
                search.flush();
              }
            }}
            enterKeyHint={search.active ? "search" : undefined}
            autoComplete="off"
            placeholder="Ej. Huberman sobre dopamina y motivación"
            className={`field text-[1.0625rem] ${auto ? "pr-10" : ""}`}
            autoFocus
          />
          {search.pending && (
            <CircleNotch
              size={20}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 motion-safe:animate-spin"
              aria-hidden
            />
          )}
        </div>
        <p className="caption mt-1.5 text-ink-2">Invitado, canal, tema o una frase del clip. Con eso busco el original.</p>
      </div>

      {searchable && (
        <section aria-label="Encontrar el original" className="card p-4">
          {picked && !searching ? (
            <div className="space-y-2">
              <p className="label">Vinculado a</p>
              <ResultRow result={picked} selected onSelect={() => setSearching(true)} actionLabel="Cambiar" />
            </div>
          ) : (
            <div className="space-y-4">
              <div role="radiogroup" aria-label="Cómo buscar" className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
                {(Object.keys(MODE_LABEL) as SearchMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => saveMode(m)}
                    className={`press min-h-11 rounded-full footnote font-semibold transition-colors ${
                      mode === m ? "bg-surface text-ink shadow-card" : "text-ink-2"
                    }`}
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>

              {auto ? (
                <AutoResults search={search} source={source} selectedId={picked?.id} onPick={pick} />
              ) : searching ? (
                <MediaSearch
                  key={`${kind}-${title}`}
                  initialQuery={title || originUrl}
                  initialSource={source}
                  selectedId={picked?.id}
                  autoSearch
                  onPick={pick}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="headline">Encuentra el original</p>
                    <p className="footnote text-ink-2">
                      {needsKey
                        ? "Falta la llave de YouTube en Vercel. Puedes guardarlo y vincularlo después."
                        : "Miniatura, duración y capítulos para retomarlo donde te quedaste."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={(title || originUrl).trim().length < 2}
                    onClick={() => setSearching(true)}
                  >
                    Buscar
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div>
        <label htmlFor="originUrl" className="label">
          Link donde lo viste (opcional)
        </label>
        <div className="relative">
          <LinkSimple size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id="originUrl"
            name="originUrl"
            type="url"
            inputMode="url"
            value={originUrl}
            onChange={(e) => setOriginUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            className="field pl-9"
          />
        </div>
        {originUrl.includes("instagram.com") && (
          <p className="caption mt-1.5 flex items-center gap-1 text-ink-2">
            <InstagramLogo size={14} aria-hidden /> Se guarda para que puedas volver al clip.
          </p>
        )}
      </div>

      <div>
        <span className="label">Formato</span>
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-2">
          {[...MAIN_KINDS, ...OTHER_KINDS].map((k) => {
            const { label, icon: KindIcon } = KIND_META[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k);
                  setPicked(null);
                  setSearching(false);
                }}
                className={`press chip min-h-11 gap-1.5 px-3.5 ${kind === k ? "bg-tint text-on-tint" : "bg-surface-2 text-ink-2"}`}
              >
                <KindIcon size={16} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="note" className="label">
          ¿Por qué lo guardaste? (opcional)
        </label>
        <textarea id="note" name="note" rows={3} placeholder="Qué te llamó la atención del clip" className="field resize-y" />
      </div>

      <input type="hidden" name="media" value={picked ? JSON.stringify(picked) : ""} />

      {state?.error && (
        <p role="alert" className="rounded-control bg-bad-soft px-4 py-3 footnote font-semibold text-bad">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || (!title.trim() && !picked)} className="btn btn-primary btn-lg w-full">
        {pending ? "Guardando…" : picked || !searchable ? "Guardar" : "Guardar sin vincular"}
      </button>
    </form>
  );
}
