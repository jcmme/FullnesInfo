"use client";

import { ArrowCounterClockwise, ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideTopic, forgetTopic } from "@/app/actions/topics";

export type DeckTopic = { key: string; title: string; hook: string; area: string; areaLabel: string };

type Decision = "guardado" | "descartado";

/** Cuánto hay que arrastrar (o lanzar) para que cuente como decisión. */
const UMBRAL = 120;

/**
 * A dónde llegaría la carta si la sueltas y se va frenando sola. Es la misma
 * proyección que usa iOS para el scroll: velocidad entre mil, por la tasa de
 * frenado, entre lo que le falta para detenerse.
 */
function proyectar(velocidad: number, frenado = 0.998): number {
  return ((velocidad / 1000) * frenado) / (1 - frenado);
}

/**
 * Los temas llegan de sorpresa, uno a la vez. Nunca tienes que pensar cuál
 * buscar: arrastras a la derecha si te interesa, a la izquierda si no, o usas
 * los botones. La tarjeta avanza en el momento y el guardado va por detrás.
 */
export function TopicDeck({ topics }: { topics: DeckTopic[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  // La baraja se reparte una sola vez, al entrar. El servidor vuelve a barajar en
  // cada render (los temas salen al azar del pozo), así que leer la lista nueva a
  // media baraja te cambiaba la carta sola y te saltaba temas sin preguntarte.
  const [deck] = useState(topics);
  const [i, setI] = useState(0);
  const [ultima, setUltima] = useState<{ key: string; salida: number } | null>(null);
  const [, start] = useTransition();

  // La posición del dedo, compartida por la carta, su giro y los dos avisos.
  const x = useMotionValue(0);
  const giro = useTransform(x, [-300, 0, 300], [-8, 0, 8]);
  const siLate = useTransform(x, [30, 140], [0, 1]);
  const siPaso = useTransform(x, [-140, -30], [1, 0]);
  const [salida, setSalida] = useState(0);

  const topic = deck[i];

  const decide = (status: Decision) => {
    if (!topic) return;
    const last = i + 1 >= deck.length;
    setSalida(status === "guardado" ? 1 : -1);
    setUltima({ key: topic.key, salida: status === "guardado" ? 1 : -1 });
    setI((n) => n + 1);
    x.set(0);
    start(async () => {
      await decideTopic({ key: topic.key, label: topic.title, area: topic.area }, status);
      // Una sola recarga al final: así "Tus temas" ya trae los que guardaste, y
      // cada decisión no cuesta un render completo de la pantalla.
      if (last) router.refresh();
    });
  };

  const deshacer = () => {
    if (!ultima) return;
    const { key } = ultima;
    setUltima(null);
    setI((n) => Math.max(0, n - 1));
    setSalida(0);
    start(async () => {
      await forgetTopic(key);
    });
  };

  if (!topic) {
    return (
      <div className="card p-5 text-center">
        <p className="headline">Por hoy ya no hay más</p>
        <p className="footnote mt-1 text-pretty text-ink-2">
          Mañana habrá temas nuevos. Los que guardaste te esperan abajo.
        </p>
        {ultima && <Deshacer onClick={deshacer} />}
      </div>
    );
  }

  const siguiente = deck[i + 1];

  return (
    <div>
      {/* El pb le aparta lugar al canto: sin él, la lámina se salía de la caja y se
          encimaba sobre los botones. */}
      <div className={`relative overflow-x-clip ${siguiente ? "pb-2" : ""}`}>
        {/* El canto de la siguiente carta, para que el mazo se lea como mazo. Es
            una lámina y no la carta completa: así se ve igual mida lo que mida. */}
        {siguiente && <div aria-hidden className="card absolute inset-x-4 bottom-0 top-4 bg-surface-2" />}

        <AnimatePresence mode="wait">
          <motion.div
            key={topic.key}
            drag="x"
            dragSnapToOrigin
            dragElastic={0.5}
            dragMomentum={false}
            style={{ x, rotate: reduce ? 0 : giro, touchAction: "pan-y" }}
            onDragEnd={(_, info) => {
              const destino = info.offset.x + proyectar(info.velocity.x);
              if (destino > UMBRAL) decide("guardado");
              else if (destino < -UMBRAL) decide("descartado");
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    x: salida * 520,
                    rotate: salida * 18,
                    transition: { type: "spring", bounce: 0, duration: 0.45 },
                  }
            }
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="relative cursor-grab active:cursor-grabbing"
          >
            <Carta topic={topic}>
              {!reduce && (
                <>
                  <motion.span
                    aria-hidden
                    style={{ opacity: siLate }}
                    className="chip absolute right-4 top-4 bg-tint text-on-tint"
                  >
                    Me interesa
                  </motion.span>
                  <motion.span
                    aria-hidden
                    style={{ opacity: siPaso }}
                    className="chip absolute left-4 top-4 bg-surface-2 text-ink-2"
                  >
                    Paso
                  </motion.span>
                </>
              )}
            </Carta>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
        <button type="button" onClick={() => decide("descartado")} className="btn btn-secondary btn-lg px-5" aria-label="Pasar este tema">
          <X size={18} weight="bold" aria-hidden />
          Paso
        </button>
        <button type="button" onClick={() => decide("guardado")} className="btn btn-primary btn-lg">
          Me interesa
          <ArrowRight size={18} weight="bold" aria-hidden />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <p className="caption text-ink-2 tabular">
          {i + 1} de {deck.length} de hoy
        </p>
        {ultima && <Deshacer onClick={deshacer} />}
      </div>
    </div>
  );
}

function Deshacer({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press flex items-center gap-1 caption font-semibold text-tint-ink">
      <ArrowCounterClockwise size={13} weight="bold" aria-hidden />
      Deshacer
    </button>
  );
}

function Carta({ topic, children }: { topic: DeckTopic; children?: React.ReactNode }) {
  return (
    <article className="card relative select-none p-5">
      <p className="flex items-center gap-1.5 caption font-semibold text-tint-ink">
        <Sparkle size={14} weight="fill" aria-hidden />
        {topic.areaLabel}
      </p>
      <p className="title-2 mt-1.5 text-balance">{topic.title}</p>
      <p className="footnote mt-2 text-pretty text-ink-2">{topic.hook}</p>
      {children}
    </article>
  );
}
