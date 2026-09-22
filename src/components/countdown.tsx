"use client";

import { useEffect, useState } from "react";
import { minutesUntilCutoff } from "@/lib/day";

/** "Cierra en 5 h 12 min": minutos que faltan para el corte del día. */
export function Countdown({ timezone, cutoffHour, done }: { timezone: string; cutoffHour: number; done: boolean }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMinutes(minutesUntilCutoff(new Date(), timezone, cutoffHour));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timezone, cutoffHour]);

  if (minutes === null) return <span className="invisible">Cierra en 0 h</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const text = h > 0 ? `${h} h ${m} min` : `${m} min`;
  const urgent = !done && minutes <= 120;
  return (
    <span className={urgent ? "font-semibold text-bad" : undefined}>
      {done ? `El día cierra en ${text}` : `Te quedan ${text}`}
    </span>
  );
}
