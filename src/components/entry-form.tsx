"use client";

import { ArrowsClockwise, CaretDown, CheckCircle, Compass, Gift, Plus } from "@phosphor-icons/react";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { saveEntry } from "@/app/actions/entries";
import { countWords, formatTimestamp } from "@/lib/format";
import type { Item } from "@/lib/types";
import { Thumb } from "./media";

const PROMPTS = [
  "¿Cuál fue la idea más importante y por qué te importa?",
  "¿Qué vas a hacer distinto a partir de hoy?",
  "Explícalo como si se lo contaras a un amigo, en tus palabras.",
  "¿Con qué no estás de acuerdo y por qué?",
  "¿Qué pregunta te dejó abierta?",
  "¿Cómo se conecta con algo que ya sabías o viviste?",
];
const MINUTE_CHIPS = [10, 20, 30, 45, 60];
const DRAFT_PREFIX = "fullnes:borrador:";

export type TodayNote = {
  id: string;
  itemId: string | null;
  mysteryId: string | null;
  topicKey: string | null;
  title: string;
  note: string;
  words: number;
  /** false si la revisión la marcó como relleno: ahí sus palabras no suman. */
  counts: boolean;
};

export type MysteryToday = { id: string; title: string; questions: string[] };

export type TopicToday = { key: string; title: string; questions: string[] };

type Subject =
  | { key: string; type: "item"; item: Item; title: string }
  | { key: string; type: "caja"; mystery: MysteryToday; title: string }
  | { key: string; type: "tema"; topicKey: string; title: string; questions: string[] }
  | { key: string; type: "otro"; noteId: string | null; title: string };

/* Borrador por tema en este dispositivo: si cierras la app, no se pierde lo escrito. */
function readDraft(key: string): string | null {
  try {
    return localStorage.getItem(DRAFT_PREFIX + key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, text: string | null) {
  try {
    if (text) localStorage.setItem(DRAFT_PREFIX + key, text);
    else localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // sin almacenamiento: el texto solo vive en pantalla
  }
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function notesOf(subject: Subject, notes: TodayNote[]): TodayNote[] {
  return notes.filter((n) =>
    subject.type === "item"
      ? n.itemId === subject.item.id
      : subject.type === "caja"
        ? n.mysteryId === subject.mystery.id
        : subject.type === "tema"
          ? n.topicKey === subject.topicKey
          : subject.noteId !== null && n.id === subject.noteId,
  );
}

/** La nota de hoy que se continúa al elegir un tema: la que abriste, o la más reciente. */
function noteFor(subject: Subject, notes: TodayNote[], preferredId?: string | null): TodayNote | null {
  const matches = notesOf(subject, notes);
  return matches.find((n) => n.id === preferredId) ?? matches.at(-1) ?? null;
}

type Props = {
  minWords: number;
  items: Item[];
  mystery: MysteryToday | null;
  topics: TopicToday[];
  todayNotes: TodayNote[];
  todayWords: number;
  initialKey: string | null;
  initialNoteId: string | null;
};

export function EntryForm({ minWords, items, mystery, topics, todayNotes, todayWords, initialKey, initialNoteId }: Props) {
  const [state, action, pending] = useActionState(saveEntry, undefined);

  const subjects: Subject[] = [
    ...items.map((item): Subject => ({ key: `item:${item.id}`, type: "item", item, title: item.media_title ?? item.title })),
    ...(mystery ? [{ key: `caja:${mystery.id}`, type: "caja", mystery, title: mystery.title } as Subject] : []),
    ...topics.map((t): Subject => ({ key: `tema:${t.key}`, type: "tema", topicKey: t.key, title: t.title, questions: t.questions })),
    ...todayNotes
      .filter((n) => !n.itemId && !n.mysteryId)
      .map((n): Subject => ({ key: `otro:${n.id}`, type: "otro", noteId: n.id, title: n.title })),
    { key: "otro:nuevo", type: "otro", noteId: null, title: "" },
  ];

  const lastNote = todayNotes.at(-1);
  const lastKey = lastNote
    ? lastNote.itemId
      ? `item:${lastNote.itemId}`
      : lastNote.mysteryId
        ? `caja:${lastNote.mysteryId}`
        : lastNote.topicKey
          ? `tema:${lastNote.topicKey}`
          : `otro:${lastNote.id}`
    : null;
  const [key, setKey] = useState(
    [initialKey, lastKey, subjects[0]?.key].find((k) => k && subjects.some((s) => s.key === k)) ?? "otro:nuevo",
  );
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [promptIndex, setPromptIndex] = useState(0);

  const subject = subjects.find((s) => s.key === key) ?? subjects[subjects.length - 1];
  const base = noteFor(subject, todayNotes, key === initialKey ? initialNoteId : null);
  const text = texts[key] ?? base?.note ?? "";
  const edited = key in texts && texts[key] !== (base?.note ?? "");
  const draft = useSyncExternalStore(subscribeStorage, () => readDraft(key), () => null);
  const showDraft = !edited && draft !== null && draft !== text;

  useEffect(() => {
    if (edited) writeDraft(key, text);
  }, [key, text, edited]);

  // El borrador se limpia cuando ya quedó guardado, no al enviar: si el guardado
  // falla o se va el internet, tu texto sigue aquí cuando vuelvas.
  useEffect(() => {
    if (!edited && draft !== null && draft === (base?.note ?? "")) writeDraft(key, null);
  }, [key, edited, draft, base]);

  const noteWords = countWords(text);
  const total = todayWords - (base?.counts ? base.words : 0) + noteWords;
  const enough = total >= minWords;
  const prompts =
    subject.type === "caja" && subject.mystery.questions.length
      ? subject.mystery.questions
      : subject.type === "tema" && subject.questions.length
        ? subject.questions
        : PROMPTS;
  const item = subject.type === "item" ? subject.item : null;
  const isAv = item && (item.kind === "video" || item.kind === "podcast");
  const title = subject.type === "otro" && !subject.noteId ? newTitle : subject.title;

  return (
    <form action={action} className="space-y-6">
      {base && <input type="hidden" name="entryId" value={base.id} />}
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {subject.type === "caja" && <input type="hidden" name="mysteryId" value={subject.mystery.id} />}
      {subject.type === "tema" && <input type="hidden" name="topicKey" value={subject.topicKey} />}
      <input type="hidden" name="kind" value={item ? item.kind : subject.type === "caja" ? "caja" : subject.type === "tema" ? "tema" : "otro"} />
      {!(subject.type === "otro" && !subject.noteId) && <input type="hidden" name="title" value={title} />}

      {/* min-w-0: un fieldset no se encoge por defecto y el carrusel empujaría la página. */}
      <fieldset className="min-w-0">
        <legend className="label">¿Sobre qué escribes?</legend>
        <div className="-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
          {subjects.map((s) => {
            const selected = s.key === key;
            const notes = notesOf(s, todayNotes);
            const written = notes.reduce((sum, n) => sum + (n.counts ? n.words : 0), 0);
            const marked = notes.some((n) => !n.counts);
            return (
              <button
                key={s.key}
                type="button"
                // Cambiar de tema limpia los minutos: eran de la nota anterior.
                onClick={() => {
                  setKey(s.key);
                  setMinutes("");
                }}
                aria-pressed={selected}
                className={`press w-36 shrink-0 snap-start rounded-card p-1.5 text-left transition-colors ${
                  selected ? "bg-tint-soft ring-2 ring-tint" : "bg-surface"
                }`}
              >
                {s.type === "item" ? (
                  <Thumb src={s.item.thumbnail_url} kind={s.item.kind} className="aspect-video" rounded="rounded-[14px]" />
                ) : (
                  <span
                    className={`grid aspect-video place-items-center rounded-[14px] ${
                      s.type === "caja" || s.type === "tema"
                        ? "bg-surface-2 text-tint-ink"
                        : "border-2 border-dashed border-line text-ink-2"
                    }`}
                  >
                    {s.type === "caja" ? (
                      <Gift size={28} aria-hidden />
                    ) : s.type === "tema" ? (
                      <Compass size={28} aria-hidden />
                    ) : (
                      <Plus size={26} aria-hidden />
                    )}
                  </span>
                )}
                <span className="caption mt-1.5 line-clamp-2 block px-1 font-semibold">
                  {s.type === "otro" && !s.noteId ? "Otra cosa" : s.title}
                </span>
                {written > 0 && <span className="caption block px-1 text-ink-2 tabular">{written} palabras hoy</span>}
                {marked && written === 0 && <span className="caption block px-1 text-bad">sin contar</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      {subject.type === "otro" && !subject.noteId && (
        <div>
          <label htmlFor="title" className="label">
            ¿Qué fue?
          </label>
          <input
            id="title"
            name="title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Un video, un libro, una plática, un tema"
            className="field"
            required
          />
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <label htmlFor="note" className="label mb-0">
            {base ? "Continúa tu nota" : "Tu nota"}
          </label>
          <button
            type="button"
            onClick={() => setPromptIndex((i) => (i + 1) % prompts.length)}
            className="press flex min-h-11 items-center gap-1 caption font-semibold text-tint-ink"
          >
            <ArrowsClockwise size={14} aria-hidden />
            Otra pregunta
          </button>
        </div>
        <p className="footnote mb-2 text-ink-2 text-pretty">{prompts[promptIndex % prompts.length]}</p>
        {showDraft && (
          <button
            type="button"
            onClick={() => setTexts((t) => ({ ...t, [key]: draft ?? "" }))}
            className="press mb-2 flex w-full items-center justify-between gap-3 rounded-control bg-tint-soft px-4 py-2.5 text-left footnote text-tint-ink"
          >
            <span>Tienes texto sin guardar ({countWords(draft ?? "")} palabras).</span>
            <span className="font-semibold">Recuperar</span>
          </button>
        )}
        <textarea
          key={key}
          id="note"
          name="note"
          value={text}
          onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))}
          rows={9}
          placeholder="Escribe con tus palabras, no copies. Lo que no puedes explicar, todavía no lo aprendiste."
          className="field min-h-56 resize-y leading-relaxed"
          required
        />
        <div className="mt-2.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out-expo ${enough ? "bg-ok" : "bg-tint"}`}
              style={{ width: `${Math.min(100, (total / minWords) * 100)}%` }}
            />
          </div>
          <span className={`caption flex items-center gap-1 font-semibold tabular ${enough ? "text-ok" : "text-ink-2"}`} aria-live="polite">
            {enough && <CheckCircle size={14} weight="fill" aria-hidden />}
            {total} / {minWords} hoy
          </span>
        </div>
        {total !== noteWords && <p className="caption mt-1 text-ink-2">Esta nota: {noteWords} palabras. El resto viene de tus otras notas de hoy.</p>}
      </div>

      <details className="group rounded-card bg-surface px-4">
        <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 footnote font-semibold [&::-webkit-details-marker]:hidden">
          Más detalles (opcional)
          <CaretDown size={16} className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-5 pb-4 pt-1">
          {item && (isAv || item.kind === "libro") && (
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              {isAv ? (
                <div>
                  <label htmlFor="progress" className="label">
                    ¿En qué minuto te quedaste?
                  </label>
                  <input
                    key={key}
                    id="progress"
                    name="progress"
                    // El teclado numérico de iPhone no trae dos puntos: para "1:23:45" hace falta el normal.
                    inputMode="text"
                    placeholder={item.progress_seconds ? formatTimestamp(item.progress_seconds) : "1:23:45"}
                    className="field tabular"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="pages" className="label">
                    ¿En qué página vas?
                  </label>
                  <input
                    key={key}
                    id="pages"
                    name="pages"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder={String(item.progress_pages || "")}
                    className="field tabular"
                  />
                </div>
              )}
              <label className="flex min-h-11 items-center gap-2 footnote font-semibold">
                <input key={key} type="checkbox" name="finished" className="size-5 accent-[var(--tint)]" />
                Lo terminé
              </label>
            </div>
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
                  className={`press chip min-h-11 px-4 tabular ${minutes === m ? "bg-tint text-on-tint" : "bg-surface-2 text-ink-2"}`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      {state?.error && (
        <p role="alert" className="rounded-control bg-bad-soft px-4 py-3 footnote font-semibold text-bad">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 md:pb-4">
        <button type="submit" disabled={pending || !text.trim() || !title.trim()} className="btn btn-primary btn-lg w-full">
          {pending ? "Guardando…" : base ? "Guardar cambios" : "Guardar nota"}
        </button>
        <p className="caption mt-2 text-center text-ink-2">Puedes volver a esta nota hoy y seguir escribiendo.</p>
      </div>
    </form>
  );
}
