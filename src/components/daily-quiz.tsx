"use client";

import { ArrowSquareOut, Check, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { QuizRound } from "@/lib/topics";

const CLAVE = "fullnes:reto:";

function leer(day: string): string | null {
  try {
    return localStorage.getItem(CLAVE + day);
  } catch {
    return null;
  }
}

function guardar(day: string, respuestas: (string | null)[]) {
  try {
    localStorage.setItem(CLAVE + day, JSON.stringify(respuestas));
  } catch {
    // sin almacenamiento: el reto vive solo en esta pantalla
  }
}

function suscribir(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * El reto del día: un dato de tus fichas y tres temas para adivinar de cuál
 * salió. No cuenta para el día ni toca la base: el día se cumple escribiendo.
 * Lo contestado se recuerda en este aparato para que no se reinicie al navegar.
 */
export function DailyQuiz({ rounds, day }: { rounds: QuizRound[]; day: string }) {
  const reduce = useReducedMotion();
  const guardadas = useSyncExternalStore(suscribir, () => leer(day), () => null);
  const [local, setLocal] = useState<(string | null)[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  const previas: (string | null)[] = (() => {
    if (local) return local;
    try {
      const raw = guardadas ? (JSON.parse(guardadas) as unknown) : null;
      if (Array.isArray(raw)) return raw.slice(0, rounds.length) as (string | null)[];
    } catch {
      // guardado corrupto: se empieza de nuevo
    }
    return [];
  })();

  const contestadas = previas.filter(Boolean).length;
  const terminado = contestadas >= rounds.length;
  const indice = terminado ? rounds.length - 1 : contestadas;
  const ronda = rounds[indice];
  const aciertos = previas.filter((r, n) => r && r === rounds[n]?.answer).length;

  const responder = (key: string) => {
    const siguiente = [...previas];
    siguiente[indice] = key;
    setLocal(siguiente);
    guardar(day, siguiente);
  };

  if (rounds.length === 0) return null;

  if (!abierto && !terminado && contestadas === 0) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="press card flex w-full items-center gap-4 p-5 text-left">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-tint-soft text-tint-ink">
          <Sparkle size={26} weight="duotone" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="headline block">¿De qué ficha salió este dato?</span>
          <span className="footnote mt-0.5 block text-pretty text-ink-2">
            {rounds.length} datos de tus temas. No cuenta para el día, es nada más por gusto.
          </span>
        </span>
        <span className="btn btn-secondary shrink-0">Jugar</span>
      </button>
    );
  }

  const elegida = previas[indice] ?? null;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label mb-0">Reto del día</p>
        <p className="caption text-ink-2 tabular">
          {Math.min(contestadas + (terminado ? 0 : 1), rounds.length)} de {rounds.length}
          {contestadas > 0 && ` · ${aciertos} ${aciertos === 1 ? "acierto" : "aciertos"}`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        >
          <p className="mt-3 text-pretty">{ronda.fact.text}</p>

          <ul className="mt-4 space-y-2">
            {ronda.options.map((o) => {
              const correcta = o.key === ronda.answer;
              const esta = elegida === o.key;
              const revelar = elegida !== null && (correcta || esta);
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    disabled={elegida !== null}
                    onClick={() => responder(o.key)}
                    className={`press flex min-h-12 w-full items-center gap-2.5 rounded-card px-4 py-2.5 text-left footnote font-semibold transition-colors ${
                      revelar && correcta
                        ? "bg-ok-soft text-ok"
                        : revelar
                          ? "bg-bad-soft text-bad"
                          : elegida !== null
                            ? "bg-surface-2 text-ink-3"
                            : "bg-surface-2"
                    }`}
                  >
                    {revelar && (correcta ? <Check size={16} weight="bold" aria-hidden /> : <X size={16} weight="bold" aria-hidden />)}
                    <span className="min-w-0 flex-1 text-pretty">{o.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {elegida !== null && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <a
                href={ronda.fact.source.url}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-1 caption text-ink-2"
              >
                {ronda.fact.source.title}
                <ArrowSquareOut size={11} aria-hidden />
              </a>
              <Link
                href={`/descubrir/${encodeURIComponent(ronda.answer)}`}
                prefetch={false}
                className="press caption font-semibold text-tint-ink"
              >
                {terminado ? "Abrir esa ficha" : "Ver la ficha"}
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {terminado && (
        <p className="footnote mt-4 text-pretty text-ink-2">
          {aciertos === rounds.length
            ? "Las tres. Se nota que sí leíste tus fichas."
            : aciertos === 0
              ? "Ninguna. Buen momento para abrir una ficha."
              : `${aciertos} de ${rounds.length}. Mañana hay datos nuevos.`}
        </p>
      )}
    </div>
  );
}
