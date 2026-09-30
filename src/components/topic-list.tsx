"use client";

import { ArrowSquareOut, CaretRight, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTopicDone } from "@/app/actions/topics";

export type TopicPreview = {
  key: string;
  title: string;
  area: string;
  deep: boolean;
  /** El resumen de la ficha, o el gancho del catálogo si todavía no está escrita. */
  summary: string;
  fact: { text: string; source: { title: string; url: string } } | null;
};

/**
 * Tus temas, hojeables: tocar uno lo abre aquí mismo con su resumen y un dato,
 * y de ahí decides si entras a la ficha completa o lo das por terminado.
 */
export function TopicList({ topics }: { topics: TopicPreview[] }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [, start] = useTransition();

  const terminar = (key: string) =>
    start(async () => {
      await setTopicDone(key, true);
      router.refresh();
    });

  return (
    <ul className="space-y-2.5">
      {topics.map((t) => {
        const on = abierto === t.key;
        return (
          <li key={t.key} className="card overflow-hidden">
            <button
              type="button"
              aria-expanded={on}
              onClick={() => setAbierto(on ? null : t.key)}
              className="press flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="headline block text-balance">{t.title}</span>
                <span className="caption mt-1 block text-ink-2">
                  {t.area}
                  {t.deep ? " · ficha completa" : ""}
                </span>
              </span>
              <motion.span
                animate={{ rotate: on ? 90 : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="shrink-0 text-ink-3"
              >
                <CaretRight size={18} aria-hidden />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t hairline px-4 pb-4 pt-3">
                    <p className="footnote text-pretty text-ink-2">{t.summary}</p>
                    {t.fact && (
                      <div className="mt-3 rounded-card bg-surface-2 p-3">
                        <p className="footnote text-pretty">{t.fact.text}</p>
                        <a
                          href={t.fact.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="press mt-1.5 inline-flex items-center gap-1 caption text-ink-2"
                        >
                          {t.fact.source.title}
                          <ArrowSquareOut size={11} aria-hidden />
                        </a>
                      </div>
                    )}
                    {!t.deep && (
                      <p className="caption mt-2 text-ink-2">Esta ficha todavía no está investigada a fondo.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/descubrir/${encodeURIComponent(t.key)}`} prefetch={false} className="btn btn-primary">
                        Abrir ficha
                      </Link>
                      <button type="button" onClick={() => terminar(t.key)} className="btn btn-secondary">
                        <Check size={18} weight="bold" aria-hidden />
                        Ya terminé
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
