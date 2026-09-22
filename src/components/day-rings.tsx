"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { minutesUntilCutoff } from "@/lib/day";

const SIZE = 212;
const OUTER = { r: 92, width: 18 };
const INNER = { r: 68, width: 13 };

function Ring({
  r,
  width,
  value,
  track,
  color,
  delay,
}: {
  r: number;
  width: number;
  value: number;
  track: string;
  color: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const c = SIZE / 2;
  return (
    <>
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={width} style={{ stroke: track }} />
      {value > 0 && (
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={width}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          style={{ stroke: color }}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: value }}
          transition={{ type: "spring", bounce: 0, duration: 1.2, delay }}
        />
      )}
    </>
  );
}

/**
 * Los anillos del día, como en la app Actividad: el de afuera son tus palabras
 * contra la meta; el de adentro, cuánto del día ya pasó hasta la hora de cierre.
 */
export function DayRings({
  words,
  minWords,
  timezone,
  cutoffHour,
}: {
  words: number;
  minWords: number;
  timezone: string;
  cutoffHour: number;
}) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setElapsed(1 - minutesUntilCutoff(new Date(), timezone, cutoffHour) / 1440);
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezone, cutoffHour]);

  const progress = Math.min(1, words / minWords);
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${words} de ${minWords} palabras hoy.`}
      >
        <Ring {...OUTER} value={progress} track="var(--ring-1-track)" color="var(--tint)" delay={0.1} />
        <Ring {...INNER} value={elapsed ?? 0} track="var(--ring-2-track)" color="var(--ring-2)" delay={0.3} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="numeral text-[3rem]">{words}</span>
        <span className="footnote text-ink-2">de {minWords} palabras</span>
      </div>
    </div>
  );
}
