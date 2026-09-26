"use client";

import { Compass, Gift, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { subjectKeyOf, type TodayNote } from "@/lib/notes";
import type { Item } from "@/lib/types";
import { Thumb } from "./media";
import { NoteComposer, notesOf, type ComposerSubject } from "./note-composer";

export type MysteryToday = { id: string; title: string; questions: string[] };

export type TopicToday = { key: string; title: string; questions: string[] };

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

/** La pantalla de escribir: eliges sobre qué y abajo va el editor de la nota. */
export function EntryForm({ minWords, items, mystery, topics, todayNotes, todayWords, initialKey, initialNoteId }: Props) {
  const subjects: ComposerSubject[] = [
    ...items.map((item): ComposerSubject => ({ key: `item:${item.id}`, kind: item.kind, title: item.media_title ?? item.title, itemId: item.id, item })),
    ...(mystery ? [{ key: `caja:${mystery.id}`, kind: "caja", title: mystery.title, mysteryId: mystery.id, questions: mystery.questions }] : []),
    ...topics.map((t): ComposerSubject => ({ key: `tema:${t.key}`, kind: "tema", title: t.title, topicKey: t.key, questions: t.questions })),
    ...todayNotes
      .filter((n) => !n.itemId && !n.mysteryId && !n.topicKey)
      .map((n): ComposerSubject => ({ key: `otro:${n.id}`, kind: "otro", title: n.title, noteId: n.id })),
    { key: "otro:nuevo", kind: "otro", title: "", needsTitle: true },
  ];

  const lastNote = todayNotes.at(-1);
  const lastKey = lastNote ? subjectKeyOf(lastNote) : null;
  const [key, setKey] = useState(
    [initialKey, lastKey, subjects[0]?.key].find((k) => k && subjects.some((s) => s.key === k)) ?? "otro:nuevo",
  );

  const subject = subjects.find((s) => s.key === key) ?? subjects[subjects.length - 1];

  return (
    <div className="space-y-6">
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
                onClick={() => setKey(s.key)}
                aria-pressed={selected}
                className={`press w-36 shrink-0 snap-start rounded-card p-1.5 text-left transition-colors ${
                  selected ? "bg-tint-soft ring-2 ring-tint" : "bg-surface"
                }`}
              >
                {s.item ? (
                  <Thumb src={s.item.thumbnail_url} kind={s.item.kind} className="aspect-video" rounded="rounded-[14px]" />
                ) : (
                  <span
                    className={`grid aspect-video place-items-center rounded-[14px] ${
                      s.mysteryId || s.topicKey ? "bg-surface-2 text-tint-ink" : "border-2 border-dashed border-line text-ink-2"
                    }`}
                  >
                    {s.mysteryId ? <Gift size={28} aria-hidden /> : s.topicKey ? <Compass size={28} aria-hidden /> : <Plus size={26} aria-hidden />}
                  </span>
                )}
                <span className="caption mt-1.5 line-clamp-2 block px-1 font-semibold">{s.needsTitle ? "Otra cosa" : s.title}</span>
                {written > 0 && <span className="caption block px-1 text-ink-2 tabular">{written} palabras hoy</span>}
                {marked && written === 0 && <span className="caption block px-1 text-bad">sin contar</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <NoteComposer
        subject={subject}
        minWords={minWords}
        todayNotes={todayNotes}
        todayWords={todayWords}
        preferredNoteId={key === initialKey ? initialNoteId : null}
      />
    </div>
  );
}
