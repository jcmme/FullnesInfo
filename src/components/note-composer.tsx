"use client";

import { ArrowsClockwise, CaretDown, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { saveEntry, type EntryFormState } from "@/app/actions/entries";
import { countWords, formatTimestamp } from "@/lib/format";
import type { TodayNote } from "@/lib/notes";
import type { Item } from "@/lib/types";

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

/** Sobre qué escribes. La llave es con la que se guarda el borrador de este tema. */
export type ComposerSubject = {
  key: string;
  title: string;
  kind: string;
  itemId?: string | null;
  mysteryId?: string | null;
  topicKey?: string | null;
  /** La nota suelta que continúas, cuando no cuelga de un guardado ni de un tema. */
  noteId?: string | null;
  questions?: string[];
  /** El guardado, para poder anotar el avance y marcarlo terminado. */
  item?: Item | null;
  /** Una nota de algo que no está guardado: primero pide qué fue. */
  needsTitle?: boolean;
};

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

export function notesOf(subject: ComposerSubject, notes: TodayNote[]): TodayNote[] {
  return notes.filter((n) =>
    subject.mysteryId
      ? n.mysteryId === subject.mysteryId
      : subject.topicKey
        ? n.topicKey === subject.topicKey
        : subject.itemId
          ? n.itemId === subject.itemId
          : subject.noteId
            ? n.id === subject.noteId
            : false,
  );
}

/** La nota de hoy que se continúa: la que abriste, o la más reciente del tema. */
function noteFor(subject: ComposerSubject, notes: TodayNote[], preferredId?: string | null): TodayNote | null {
  const matches = notesOf(subject, notes);
  return matches.find((n) => n.id === preferredId) ?? matches.at(-1) ?? null;
}

type Props = {
  subject: ComposerSubject;
  minWords: number;
  todayNotes: TodayNote[];
  todayWords: number;
  preferredNoteId?: string | null;
  /**
   * true donde la nota vive junto al material: guardar no te mueve de la pantalla
   * y el botón va dentro de la tarjeta. En /registrar la nota es toda la pantalla,
   * el botón se queda pegado abajo y al guardar te lleva a Hoy.
   */
  stay?: boolean;
};

/**
 * El editor de una nota. Lo monta /registrar con su lista de temas, y también las
 * pantallas donde está el material, para que escribas sin separarte del video.
 */
export function NoteComposer({ subject, minWords, todayNotes, todayWords, preferredNoteId, stay }: Props) {
  const [state, action, pending] = useActionState(saveEntry, undefined);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  // Por tema, igual que los textos: los minutos de una nota no son los de otra.
  const [minutes, setMinutes] = useState<Record<string, number | "">>({});
  const [promptIndex, setPromptIndex] = useState(0);
  /** El resultado de guardado que ya diste por visto al seguir escribiendo. */
  const [dismissed, setDismissed] = useState<EntryFormState>(undefined);

  const key = subject.key;
  const base = noteFor(subject, todayNotes, preferredNoteId);
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
  const prompts = subject.questions?.length ? subject.questions : PROMPTS;
  const item = subject.item ?? null;
  const isAv = item && (item.kind === "video" || item.kind === "podcast");
  const title = subject.needsTitle ? newTitle : subject.title;
  const chosenMinutes = minutes[key] ?? "";
  // Cómo quedó el día se dice aquí mismo, y el aviso se va en cuanto sigues escribiendo.
  const saved = dismissed === state ? undefined : state?.saved;

  return (
    <form action={action} className="space-y-6">
      {base && <input type="hidden" name="entryId" value={base.id} />}
      {subject.itemId && <input type="hidden" name="itemId" value={subject.itemId} />}
      {subject.mysteryId && <input type="hidden" name="mysteryId" value={subject.mysteryId} />}
      {subject.topicKey && <input type="hidden" name="topicKey" value={subject.topicKey} />}
      <input type="hidden" name="kind" value={subject.kind} />
      {stay && <input type="hidden" name="stay" value="1" />}
      {!subject.needsTitle && <input type="hidden" name="title" value={title} />}

      {subject.needsTitle && (
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
          onChange={(e) => {
            setTexts((t) => ({ ...t, [key]: e.target.value }));
            setDismissed(state);
          }}
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
            <input type="hidden" name="minutes" value={chosenMinutes} />
            <div className="flex flex-wrap gap-2">
              {MINUTE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={chosenMinutes === chip}
                  onClick={() => setMinutes((m) => ({ ...m, [key]: chosenMinutes === chip ? "" : chip }))}
                  className={`press chip min-h-11 px-4 tabular ${chosenMinutes === chip ? "bg-tint text-on-tint" : "bg-surface-2 text-ink-2"}`}
                >
                  {chip} min
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

      {saved && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-control px-4 py-3 footnote ${saved.counts ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}
        >
          {saved.counts ? (
            <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 flex-1 text-pretty">
            {saved.counts ? (
              saved.done ? (
                <>
                  Guardada. Día cumplido con {saved.words} palabras.{" "}
                  <Link href="/" className="font-semibold underline underline-offset-2">
                    Ver Hoy
                  </Link>
                </>
              ) : (
                `Guardada. Llevas ${saved.words} de ${minWords} palabras hoy.`
              )
            ) : (
              <>
                La guardé, pero parece relleno y no la conté para hoy.{" "}
                <Link href="/" className="font-semibold underline underline-offset-2">
                  Dime que sí la escribiste tú
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <div
        className={
          stay
            ? ""
            : "sticky bottom-0 -mx-4 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 md:pb-4"
        }
      >
        <button type="submit" disabled={pending || !text.trim() || !title.trim()} className="btn btn-primary btn-lg w-full">
          {pending ? "Guardando…" : base ? "Guardar cambios" : "Guardar nota"}
        </button>
        <p className="caption mt-2 text-center text-ink-2">Puedes volver a esta nota hoy y seguir escribiendo.</p>
      </div>
    </form>
  );
}
