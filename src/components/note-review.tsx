"use client";

import { Lightbulb, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { appealEntry } from "@/app/actions/topics";
import type { ReviewReason } from "@/lib/review";

/** Lo que ve el usuario por cada motivo. En corto y sin regañar. */
const SAYS: Record<ReviewReason, string> = {
  "sin-sentido": "Esta nota no parece texto escrito: no la estoy contando para hoy.",
  repetida: "Esta nota repite lo mismo una y otra vez: no la estoy contando para hoy.",
  "copiada-de-ti": "Esta nota es igual a otra que ya escribiste hoy: no la estoy contando dos veces.",
  "copiada-del-material": "Esta nota está casi calcada del video. Lo que se te queda es lo que escribes con tus palabras.",
  "fuera-de-tema": "Esta nota no parece hablar de lo que dijiste que viste. Cuenta igual, solo te lo comento.",
};

export type FlaggedNote = {
  id: string;
  title: string;
  counts: boolean;
  reasons: ReviewReason[];
  /** Lo que la ficha del tema dice y tú no mencionaste. */
  missed: string[];
};

export function NoteReview({ note }: { note: FlaggedNote }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const blocked = !note.counts;
  const message = SAYS[note.reasons[0]] ?? "Revisa esta nota.";

  return (
    <div className={`rounded-card p-4 ${blocked ? "bg-bad-soft" : "bg-surface"}`}>
      <div className="flex items-start gap-3">
        {blocked ? (
          <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-bad" aria-hidden />
        ) : (
          <Lightbulb size={22} weight="fill" className="mt-0.5 shrink-0 text-tint-ink" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className={`footnote font-semibold ${blocked ? "text-bad" : ""}`}>{note.title}</p>
          <p className="footnote mt-0.5 text-pretty text-ink-2">{message}</p>

          {note.missed.length > 0 && (
            <div className="mt-3">
              <p className="label">Lo que te faltó</p>
              <ul className="space-y-1.5">
                {note.missed.map((m, i) => (
                  <li key={i} className="footnote text-pretty text-ink-2">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/registrar?nota=${note.id}`} className="btn btn-secondary min-h-11 px-3.5 footnote">
              Abrir la nota
            </Link>
            {blocked && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await appealEntry(note.id);
                    if (!("error" in res)) {
                      setGone(true);
                      router.refresh();
                    }
                  })
                }
                className="btn btn-ghost min-h-11 px-3.5 footnote font-semibold text-tint-ink"
              >
                {pending ? "Listo…" : "Sí la escribí yo"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
