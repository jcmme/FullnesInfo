"use client";

import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideTopic } from "@/app/actions/topics";

export type DeckTopic = { key: string; title: string; hook: string; area: string; areaLabel: string };

/**
 * Los temas llegan de sorpresa, uno a la vez. Nunca tienes que pensar cuál
 * buscar: solo dices si te late o pasas. La tarjeta avanza en el momento y el
 * guardado va por detrás, para que no se sienta ninguna espera.
 */
export function TopicDeck({ topics }: { topics: DeckTopic[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [, start] = useTransition();
  const topic = topics[i];

  const decide = (status: "guardado" | "descartado") => {
    if (!topic) return;
    setI((n) => n + 1);
    start(async () => {
      await decideTopic({ key: topic.key, label: topic.title, area: topic.area }, status);
      if (i + 1 >= topics.length) router.refresh();
    });
  };

  if (!topic) {
    return (
      <div className="card p-5 text-center">
        <p className="headline">Por hoy ya no hay más</p>
        <p className="footnote mt-1 text-pretty text-ink-2">
          Mañana habrá temas nuevos. Los que guardaste te esperan abajo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={topic.key}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="card p-5"
        >
          <p className="flex items-center gap-1.5 caption font-semibold text-tint-ink">
            <Sparkle size={14} weight="fill" aria-hidden />
            {topic.areaLabel}
          </p>
          <p className="title-2 mt-1.5 text-balance">{topic.title}</p>
          <p className="footnote mt-2 text-pretty text-ink-2">{topic.hook}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
        <button type="button" onClick={() => decide("descartado")} className="btn btn-secondary btn-lg px-5" aria-label="Pasar este tema">
          <X size={18} weight="bold" aria-hidden />
          Paso
        </button>
        <button type="button" onClick={() => decide("guardado")} className="btn btn-primary btn-lg">
          Me late
          <ArrowRight size={18} weight="bold" aria-hidden />
        </button>
      </div>
      <p className="caption mt-2 text-center text-ink-2 tabular">
        {i + 1} de {topics.length} de hoy
      </p>
    </div>
  );
}
