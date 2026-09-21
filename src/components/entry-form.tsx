"use client";

import { ArrowsClockwise, CheckCircle } from "@phosphor-icons/react";
import { useActionState, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createEntry } from "@/app/actions/entries";
import { countWords, formatTimestamp } from "@/lib/format";
import type { Item, ItemKind } from "@/lib/types";
import { KIND_META, Thumb } from "./media";

const PROMPTS = [
  "¿Cuál fue la idea más importante y por qué te importa?",
  "¿Qué vas a hacer distinto a partir de hoy?",
  "Explícalo como si se lo contaras a un amigo, en tus palabras.",
  "¿Con qué no estás de acuerdo y por qué?",
  "¿Qué pregunta te dejó abierta?",
  "¿Cómo se conecta con algo que ya sabías o viviste?",
];

const NEW_KINDS: ItemKind[] = ["video", "podcast", "libro", "curso", "articulo", "documento", "hilo", "otro"];
const MINUTE_CHIPS = [10, 20, 30, 45, 60];
const DRAFT_KEY = "fullnes:borrador";

function readDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

type Props = {
  minWords: number;
  items: Item[];
  initialItemId: string | null;
  mystery: { id: string; title: string; questions: string[] } | null;
};

export function EntryForm({ minWords, items, initialItemId, mystery }: Props) {
  const [state, action, pending] = useActionState(createEntry, undefined);
  const [mode, setMode] = useState<"biblioteca" | "nuevo">(mystery || !items.length ? "nuevo" : "biblioteca");
  const [itemId, setItemId] = useState<string | null>(initialItemId ?? (mystery ? null : items[0]?.id ?? null));
  const [kind, setKind] = useState<ItemKind>("video");
  const [title, setTitle] = useState(mystery?.title ?? "");
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");
  const prompts = mystery?.questions.length ? mystery.questions : PROMPTS;
  const [promptIndex, setPromptIndex] = useState(0);
  const savedDraft = useSyncExternalStore(subscribeStorage, readDraft, () => null);

  useEffect(() => {
    try {
      if (note) localStorage.setItem(DRAFT_KEY, note);
    } catch {
      // almacenamiento no disponible: el borrador solo vive en pantalla
    }
  }, [note]);

  const item = mode === "biblioteca" ? items.find((i) => i.id === itemId) ?? null : null;
  const words = useMemo(() => countWords(note), [note]);
  const enough = words >= minWords;
  const isAv = item && (item.kind === "video" || item.kind === "podcast");

  return (
    <form
      action={(fd) => {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        return action(fd);
      }}
      className="space-y-6"
    >
      {mystery && <input type="hidden" name="mysteryId" value={mystery.id} />}

      {!mystery && items.length > 0 && (
        <div role="radiogroup" aria-label="Origen" className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
          {(["biblioteca", "nuevo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`press min-h-10 rounded-full footnote font-semibold transition-colors ${
                mode === m ? "bg-surface text-ink shadow-card" : "text-ink-2"
              }`}
            >
              {m === "biblioteca" ? "De mi biblioteca" : "Algo nuevo"}
            </button>
          ))}
        </div>
      )}

      {mode === "biblioteca" && item ? (
        <fieldset className="space-y-3">
          <legend className="label">¿Qué consumiste?</legend>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="kind" value={item.kind} />
          <input type="hidden" name="title" value={item.media_title ?? item.title} />
          <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {items.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setItemId(i.id)}
                aria-pressed={i.id === itemId}
                className={`press w-40 shrink-0 snap-start rounded-card p-1.5 text-left transition-colors ${
                  i.id === itemId ? "bg-tint-soft ring-2 ring-tint" : "bg-surface"
                }`}
              >
                <Thumb src={i.thumbnail_url} kind={i.kind} className="aspect-video" />
                <span className="caption mt-1.5 line-clamp-2 block px-1 font-semibold">{i.media_title ?? i.title}</span>
              </button>
            ))}
          </div>

          {isAv && (
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <label htmlFor="progress" className="label">
                  ¿En qué minuto te quedaste?
                </label>
                <input
                  id="progress"
                  name="progress"
                  inputMode="numeric"
                  placeholder={item.progress_seconds ? formatTimestamp(item.progress_seconds) : "1:23:45"}
                  className="field tabular"
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 footnote font-semibold">
                <input type="checkbox" name="finished" className="size-5 accent-[var(--tint)]" />
                Lo terminé
              </label>
            </div>
          )}
          {item.kind === "libro" && (
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <label htmlFor="pages" className="label">
                  ¿En qué página vas?
                </label>
                <input
                  id="pages"
                  name="pages"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={String(item.progress_pages || "")}
                  className="field tabular"
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 footnote font-semibold">
                <input type="checkbox" name="finished" className="size-5 accent-[var(--tint)]" />
                Lo terminé
              </label>
            </div>
          )}
        </fieldset>
      ) : (
        <fieldset className="space-y-4">
          <legend className="sr-only">Algo nuevo</legend>
          <div>
            <span className="label">Formato</span>
            <input type="hidden" name="kind" value={kind} />
            <div className="flex flex-wrap gap-2">
              {NEW_KINDS.map((k) => {
                const { label, icon: KindIcon } = KIND_META[k];
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={`press chip min-h-9 gap-1.5 px-3 ${kind === k ? "bg-tint text-on-tint" : "bg-surface-2 text-ink-2"}`}
                  >
                    <KindIcon size={16} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="title" className="label">
              ¿Qué fue?
            </label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del video, libro, curso o tema"
              className="field"
              required
            />
          </div>
        </fieldset>
      )}

      <div>
        <span className="label">Tiempo que le dedicaste</span>
        <input type="hidden" name="minutes" value={minutes} />
        <div className="flex flex-wrap gap-2">
          {MINUTE_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              onClick={() => setMinutes(minutes === m ? "" : m)}
              className={`press chip min-h-9 px-3.5 tabular ${minutes === m ? "bg-tint text-on-tint" : "bg-surface-2 text-ink-2"}`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <label htmlFor="note" className="label mb-0">
            Tu nota
          </label>
          <button
            type="button"
            onClick={() => setPromptIndex((i) => (i + 1) % prompts.length)}
            className="press flex min-h-9 items-center gap-1 caption font-semibold text-tint-ink"
          >
            <ArrowsClockwise size={14} aria-hidden />
            Otra pregunta
          </button>
        </div>
        <p className="footnote mb-2 text-ink-2 text-pretty">{prompts[promptIndex]}</p>
        {!note && savedDraft && (
          <button
            type="button"
            onClick={() => setNote(savedDraft)}
            className="press mb-2 flex w-full items-center justify-between gap-3 rounded-control bg-tint-soft px-4 py-2.5 text-left footnote text-tint-ink"
          >
            <span>Tienes un borrador sin guardar ({countWords(savedDraft)} palabras).</span>
            <span className="font-semibold">Recuperar</span>
          </button>
        )}
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={8}
          placeholder="Escribe con tus palabras, no copies. Lo que no puedes explicar, todavía no lo aprendiste."
          className="field min-h-48 resize-y leading-relaxed"
          required
        />
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out-expo ${enough ? "bg-ok" : "bg-tint"}`}
              style={{ width: `${Math.min(100, (words / minWords) * 100)}%` }}
            />
          </div>
          <span className={`caption flex items-center gap-1 font-semibold tabular ${enough ? "text-ok" : "text-ink-2"}`} aria-live="polite">
            {enough && <CheckCircle size={14} weight="fill" aria-hidden />}
            {words} / {minWords} palabras
          </span>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-control bg-bad-soft px-4 py-3 footnote font-semibold text-bad">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] -mx-4 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pb-3 pt-6 md:bottom-0">
        <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
          {pending ? "Guardando…" : enough ? "Guardar y cumplir el día" : "Guardar registro"}
        </button>
        {!enough && words > 0 && (
          <p className="caption mt-2 text-center text-ink-2">
            Se guarda, pero el día cuenta hasta que una nota llegue a {minWords} palabras.
          </p>
        )}
      </div>
    </form>
  );
}
