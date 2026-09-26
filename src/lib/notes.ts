import type { Entry } from "./types";

/** Una nota de hoy, como la ven el formulario y las pantallas que lo montan. */
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

export function notesOfToday(entries: Entry[]): TodayNote[] {
  return entries.map((e) => ({
    id: e.id,
    itemId: e.item_id,
    mysteryId: e.mystery_id,
    topicKey: e.topic_key,
    title: e.title,
    note: e.note,
    words: e.word_count,
    counts: e.counts,
  }));
}

/** Lo que llevas hoy: las notas que la revisión marcó no suman. */
export function wordsOfToday(notes: TodayNote[]): number {
  return notes.reduce((sum, n) => sum + (n.counts ? n.words : 0), 0);
}

/** La llave del sujeto de una nota: con ella se guarda su borrador y se reabre. */
export function subjectKeyOf(note: Pick<TodayNote, "id" | "itemId" | "mysteryId" | "topicKey">): string {
  if (note.mysteryId) return `caja:${note.mysteryId}`;
  if (note.topicKey) return `tema:${note.topicKey}`;
  if (note.itemId) return `item:${note.itemId}`;
  return `otro:${note.id}`;
}
